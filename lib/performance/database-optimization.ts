/* eslint-disable @typescript-eslint/no-explicit-any */
import { PostgrestBuilder } from '@supabase/postgrest-js';
import { secureLogger, LogCategory } from '@/lib/logging/secure-logger';
import { DatabaseQueryTracker } from './server-monitoring';

// Pagination configuration
export interface PaginationOptions {
  page: number;
  limit: number;
  maxLimit?: number;
  defaultLimit?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Sorting configuration
export interface SortOptions {
  column: string;
  ascending: boolean;
  allowedColumns?: string[];
}

// Query optimization utilities
export class DatabaseOptimizer {
  private static readonly DEFAULT_LIMIT = 50;
  private static readonly MAX_LIMIT = 1000;
  private static readonly ALLOWED_SORT_COLUMNS: Record<string, string[]> = {
    customers: ['id', 'name', 'email', 'company_name', 'created_at', 'updated_at'],
    orders: ['id', 'total_amount', 'status', 'created_at', 'updated_at'],
    items: ['id', 'name', 'price', 'stock_quantity', 'created_at', 'updated_at'],
    reports: ['id', 'name', 'created_at', 'updated_at'],
    deals: ['id', 'value', 'stage', 'created_at', 'updated_at'],
    leads: ['id', 'value', 'status', 'created_at', 'updated_at']
  };

  /**
   * Parse pagination parameters from URL search params
   */
  static parsePaginationParams(searchParams: URLSearchParams): PaginationOptions {
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(
      this.MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get('limit') || String(this.DEFAULT_LIMIT), 10))
    );

    return {
      page,
      limit,
      maxLimit: this.MAX_LIMIT,
      defaultLimit: this.DEFAULT_LIMIT
    };
  }

  /**
   * Parse sorting parameters from URL search params
   */
  static parseSortParams(searchParams: URLSearchParams, tableName: string): SortOptions {
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const allowedColumns = this.ALLOWED_SORT_COLUMNS[tableName] || ['id', 'created_at'];

    // Validate sort column for security
    const column = allowedColumns.includes(sortBy) ? sortBy : allowedColumns[0];
    const ascending = sortOrder === 'asc';

    return {
      column,
      ascending,
      allowedColumns
    };
  }

  /**
   * Apply pagination to a Supabase query
   */
  static applyPagination(
    query: PostgrestBuilder<any, any, any>,
    pagination: PaginationOptions
  ): PostgrestBuilder<any, any, any> {
    const offset = (pagination.page - 1) * pagination.limit;
    return (query as any).range(offset, offset + pagination.limit - 1);
  }

  /**
   * Apply sorting to a Supabase query
   */
  static applySorting(
    query: PostgrestBuilder<any, any, any>,
    sort: SortOptions
  ): PostgrestBuilder<any, any, any> {
    return (query as any).order(sort.column, { ascending: sort.ascending });
  }

  /**
   * Execute a paginated query with performance tracking
   */
  static async executePaginatedQuery<T>(
    queryBuilder: () => PostgrestBuilder<any, any, any>,
    countQueryBuilder: () => PostgrestBuilder<any, any, any>,
    pagination: PaginationOptions,
    sort: SortOptions,
    tableName: string
  ): Promise<PaginationResult<T>> {
    const startTime = Date.now();

    try {
      // Build and execute the main query
      let query = queryBuilder();
      query = this.applySorting(query, sort);
      query = this.applyPagination(query, pagination);

      // Build and execute count query for total
      const countQuery = (countQueryBuilder() as any).select('id', { count: 'exact', head: true });

      // Execute both queries in parallel
      const [dataResult, countResult] = await Promise.all([
        query,
        countQuery
      ]);

      const duration = Date.now() - startTime;

      // Track query performance
      DatabaseQueryTracker.trackQuery(
        `SELECT ${tableName} with pagination`,
        duration
      );

      if (dataResult.error) {
        throw new Error(`Data query failed: ${dataResult.error.message}`);
      }

      if (countResult.error) {
        throw new Error(`Count query failed: ${countResult.error.message}`);
      }

      const data = dataResult.data || [];
      const total = countResult.count || 0;
      const totalPages = Math.ceil(total / pagination.limit);

      // Log query performance if slow
      if (duration > 1000) {
        await secureLogger.warn('Slow paginated query detected', {
          table: tableName,
          duration,
          page: pagination.page,
          limit: pagination.limit,
          total,
          sortColumn: sort.column,
          sortOrder: sort.ascending ? 'asc' : 'desc'
        }, {
          category: LogCategory.DATABASE
        });
      }

      return {
        data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1
        }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      
      await secureLogger.error('Paginated query failed', {
        table: tableName,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        page: pagination.page,
        limit: pagination.limit
      }, {
        category: LogCategory.DATABASE
      });

      throw error;
    }
  }

  /**
   * Create optimized select fields for common queries
   */
  static getOptimizedFields(tableName: string, includeAll: boolean = false): string {
    const fieldMaps: Record<string, { basic: string; full: string }> = {
      customers: {
        basic: 'id, name, email, company_name, status, created_at',
        full: 'id, name, email, phone, company, company_name, type, status, portal_access, address, city, state, zip, created_at, updated_at'
      },
      orders: {
        basic: 'id, total_amount, status, customer_id, created_at',
        full: 'id, order_number, total_amount, status, financial_stage, customer_id, shipping_address, billing_address, created_at, updated_at'
      },
      items: {
        basic: 'id, name, price, stock_quantity, collection_id',
        full: 'id, name, description, price, cost, stock_quantity, min_stock_level, collection_id, is_active, created_at, updated_at'
      },
      deals: {
        basic: 'id, title, value, stage, probability, created_at',
        full: 'id, title, description, value, stage, probability, customer_id, assigned_to, expected_close_date, created_at, updated_at'
      },
      leads: {
        basic: 'id, name, email, status, value, created_at',
        full: 'id, name, email, phone, company, status, source, value, assigned_to, created_at, updated_at'
      }
    };

    const fields = fieldMaps[tableName];
    if (!fields) {
      return '*'; // Fallback to all fields if table not configured
    }

    return includeAll ? fields.full : fields.basic;
  }

  /**
   * Generate database query hints for common optimization patterns
   */
  static getQueryHints(tableName: string, operation: 'select' | 'insert' | 'update' | 'delete'): string[] {
    const hints: string[] = [];

    switch (operation) {
      case 'select':
        hints.push('Consider adding indexes on frequently queried columns');
        if (tableName === 'orders') {
          hints.push('Use customer_id and status indexes for faster filtering');
        }
        if (tableName === 'items') {
          hints.push('Use collection_id and is_active indexes for inventory queries');
        }
        break;

      case 'insert':
        hints.push('Use batch inserts for multiple records to improve performance');
        break;

      case 'update':
        hints.push('Use specific WHERE clauses to limit update scope');
        break;

      case 'delete':
        hints.push('Consider soft deletes instead of hard deletes for audit trails');
        break;
    }

    return hints;
  }

  /**
   * Validate and sanitize search terms to prevent injection
   */
  static sanitizeSearchTerm(term: string): string {
    if (!term || typeof term !== 'string') {
      return '';
    }

    // Remove potentially dangerous characters
    const sanitized = term
      .replace(/[%_]/g, '\\$&')  // Escape SQL wildcards
      .replace(/['"`;()]/g, '')  // Remove SQL special characters
      .trim()
      .substring(0, 100); // Limit length

    return sanitized;
  }

  /**
   * Build search conditions for full-text search
   */
  static buildSearchConditions(
    searchTerm: string,
    searchFields: string[],
    exact: boolean = false
  ): string {
    const sanitized = this.sanitizeSearchTerm(searchTerm);
    if (!sanitized) {
      return '';
    }

    const operator = exact ? 'eq' : 'ilike';
    const value = exact ? sanitized : `%${sanitized}%`;

    const conditions = searchFields.map(field => `${field}.${operator}.${value}`);
    return conditions.join(',');
  }
}

// Common pagination middleware for API routes
export function withPagination<T extends unknown[]>(
  handler: (
    request: Request,
    pagination: PaginationOptions,
    sort: SortOptions,
    ...args: T
  ) => Promise<Response>
) {
  return async (request: Request, ...args: T): Promise<Response> => {
    const url = new URL(request.url);
    const pagination = DatabaseOptimizer.parsePaginationParams(url.searchParams);
    
    // Extract table name from URL path (basic extraction)
    const pathParts = url.pathname.split('/');
    const tableName = pathParts[pathParts.length - 1] || 'default';
    const sort = DatabaseOptimizer.parseSortParams(url.searchParams, tableName);

    return handler(request, pagination, sort, ...args);
  };
}

// Query performance analyzer
export class QueryPerformanceAnalyzer {
  private static slowQueries: Array<{
    query: string;
    duration: number;
    table: string;
    timestamp: number;
  }> = [];

  static recordSlowQuery(query: string, duration: number, table: string): void {
    this.slowQueries.push({
      query: query.substring(0, 200), // Truncate for security
      duration,
      table,
      timestamp: Date.now()
    });

    // Keep only last 100 slow queries
    if (this.slowQueries.length > 100) {
      this.slowQueries.shift();
    }
  }

  static getSlowQueryReport(): {
    totalSlowQueries: number;
    averageDuration: number;
    topSlowTables: Array<{ table: string; count: number; avgDuration: number }>;
    recentQueries: Array<{ query: string; duration: number; table: string }>;
  } {
    if (this.slowQueries.length === 0) {
      return {
        totalSlowQueries: 0,
        averageDuration: 0,
        topSlowTables: [],
        recentQueries: []
      };
    }

    const totalSlowQueries = this.slowQueries.length;
    const averageDuration = this.slowQueries.reduce((sum, q) => sum + q.duration, 0) / totalSlowQueries;

    // Group by table
    const tableStats = this.slowQueries.reduce((acc, query) => {
      if (!acc[query.table]) {
        acc[query.table] = { count: 0, totalDuration: 0 };
      }
      acc[query.table].count++;
      acc[query.table].totalDuration += query.duration;
      return acc;
    }, {} as Record<string, { count: number; totalDuration: number }>);

    const topSlowTables = Object.entries(tableStats)
      .map(([table, stats]) => ({
        table,
        count: stats.count,
        avgDuration: Math.round(stats.totalDuration / stats.count)
      }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5);

    const recentQueries = this.slowQueries
      .slice(-10)
      .map(q => ({
        query: q.query,
        duration: q.duration,
        table: q.table
      }));

    return {
      totalSlowQueries,
      averageDuration: Math.round(averageDuration),
      topSlowTables,
      recentQueries
    };
  }
}