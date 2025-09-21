/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { secureLogger, LogCategory } from '@/lib/logging/secure-logger';

// GDPR data processing lawful bases
export enum LawfulBasis {
  CONSENT = 'consent',
  CONTRACT = 'contract',
  LEGAL_OBLIGATION = 'legal_obligation',
  VITAL_INTERESTS = 'vital_interests',
  PUBLIC_TASK = 'public_task',
  LEGITIMATE_INTERESTS = 'legitimate_interests'
}

// Data categories for GDPR classification
export enum DataCategory {
  PERSONAL_DATA = 'personal_data',
  SENSITIVE_DATA = 'sensitive_data',
  FINANCIAL_DATA = 'financial_data',
  TECHNICAL_DATA = 'technical_data',
  COMMUNICATIONS_DATA = 'communications_data'
}

// GDPR subject rights
export enum SubjectRights {
  ACCESS = 'access',
  RECTIFICATION = 'rectification',
  ERASURE = 'erasure',
  RESTRICT_PROCESSING = 'restrict_processing',
  DATA_PORTABILITY = 'data_portability',
  OBJECT = 'object',
  WITHDRAW_CONSENT = 'withdraw_consent'
}

// Data processing record
export interface DataProcessingRecord {
  id: string;
  userId: string;
  dataCategory: DataCategory;
  lawfulBasis: LawfulBasis;
  processingPurpose: string;
  dataCollected: string[];
  retentionPeriod: number; // in days
  thirdPartySharing: boolean;
  consentGiven?: boolean;
  consentTimestamp?: number;
  processingTimestamp: number;
}

// GDPR request
export interface GDPRRequest {
  id: string;
  userId: string;
  requestType: SubjectRights;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  submittedAt: number;
  completedAt?: number;
  requestData?: Record<string, unknown>;
  responseData?: Record<string, unknown>;
  verificationStatus: 'unverified' | 'verified' | 'failed';
}

// Data retention policy
export interface RetentionPolicy {
  dataType: string;
  retentionPeriod: number; // days
  deletionMethod: 'soft' | 'hard';
  lawfulBasis: LawfulBasis;
  exceptions?: string[];
}

// GDPR compliance manager
export class GDPRComplianceManager {
  private static instance: GDPRComplianceManager;
  private dataProcessingRecords: DataProcessingRecord[] = [];
  private gdprRequests: GDPRRequest[] = [];
  
  // Default retention policies
  private retentionPolicies: RetentionPolicy[] = [
    {
      dataType: 'user_accounts',
      retentionPeriod: 2555, // 7 years for business records
      deletionMethod: 'soft',
      lawfulBasis: LawfulBasis.CONTRACT
    },
    {
      dataType: 'order_data',
      retentionPeriod: 2555, // 7 years for financial records
      deletionMethod: 'soft',
      lawfulBasis: LawfulBasis.CONTRACT
    },
    {
      dataType: 'marketing_data',
      retentionPeriod: 730, // 2 years for marketing
      deletionMethod: 'hard',
      lawfulBasis: LawfulBasis.CONSENT
    },
    {
      dataType: 'session_logs',
      retentionPeriod: 90, // 3 months for technical logs
      deletionMethod: 'hard',
      lawfulBasis: LawfulBasis.LEGITIMATE_INTERESTS
    },
    {
      dataType: 'security_logs',
      retentionPeriod: 365, // 1 year for security
      deletionMethod: 'soft',
      lawfulBasis: LawfulBasis.LEGAL_OBLIGATION
    }
  ];

  static getInstance(): GDPRComplianceManager {
    if (!GDPRComplianceManager.instance) {
      GDPRComplianceManager.instance = new GDPRComplianceManager();
    }
    return GDPRComplianceManager.instance;
  }

  // Record data processing activity
  async recordDataProcessing(
    userId: string,
    dataCategory: DataCategory,
    lawfulBasis: LawfulBasis,
    processingPurpose: string,
    dataCollected: string[],
    consentGiven?: boolean
  ): Promise<void> {
    const record: DataProcessingRecord = {
      id: `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      dataCategory,
      lawfulBasis,
      processingPurpose,
      dataCollected,
      retentionPeriod: this.getRetentionPeriod(dataCategory),
      thirdPartySharing: false, // Default to false, update if needed
      consentGiven,
      consentTimestamp: consentGiven ? Date.now() : undefined,
      processingTimestamp: Date.now()
    };

    this.dataProcessingRecords.push(record);

    await secureLogger.info('GDPR data processing recorded', {
      userId,
      dataCategory,
      lawfulBasis,
      processingPurpose,
      consentRequired: lawfulBasis === LawfulBasis.CONSENT,
      consentGiven
    }, {
      category: LogCategory.AUDIT
    });
  }

  // Submit GDPR subject rights request
  async submitSubjectRightsRequest(
    userId: string,
    requestType: SubjectRights,
    requestData?: Record<string, unknown>
  ): Promise<string> {
    const request: GDPRRequest = {
      id: `gdpr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      requestType,
      status: 'pending',
      submittedAt: Date.now(),
      requestData,
      verificationStatus: 'unverified'
    };

    this.gdprRequests.push(request);

    await secureLogger.info('GDPR subject rights request submitted', {
      requestId: request.id,
      userId,
      requestType,
      submittedAt: new Date(request.submittedAt).toISOString()
    }, {
      category: LogCategory.AUDIT
    });

    // Auto-process certain requests if possible
    if (requestType === SubjectRights.ACCESS) {
      await this.processAccessRequest(request.id);
    }

    return request.id;
  }

  // Process access request (Right to Access)
  async processAccessRequest(requestId: string): Promise<void> {
    const request = this.gdprRequests.find(r => r.id === requestId);
    if (!request || request.requestType !== SubjectRights.ACCESS) {
      return;
    }

    request.status = 'in_progress';

    try {
      const supabase = await createServerSupabaseClient();
      
      // Collect user data from various tables
      const userData: Record<string, unknown> = {};

      // Get user profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', request.userId)
        .single();

      if (profile) {
        userData.profile = this.sanitizeDataForExport(profile);
      }

      // Get customer data if exists
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', request.userId);

      if (customer && customer.length > 0) {
        userData.customer = this.sanitizeDataForExport(customer[0]);
      }

      // Get order data
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', request.userId);

      if (orders && orders.length > 0) {
        userData.orders = orders.map((order: any) => this.sanitizeDataForExport(order));
      }

      // Get data processing records
      const userProcessingRecords = this.dataProcessingRecords.filter(
        r => r.userId === request.userId
      );
      
      userData.dataProcessingRecords = userProcessingRecords.map(record => ({
        dataCategory: record.dataCategory,
        lawfulBasis: record.lawfulBasis,
        processingPurpose: record.processingPurpose,
        dataCollected: record.dataCollected,
        retentionPeriod: record.retentionPeriod,
        consentGiven: record.consentGiven,
        processingDate: new Date(record.processingTimestamp).toISOString()
      }));

      request.responseData = userData;
      request.status = 'completed';
      request.completedAt = Date.now();

      await secureLogger.info('GDPR access request completed', {
        requestId,
        userId: request.userId,
        dataTypesIncluded: Object.keys(userData),
        completedAt: new Date().toISOString()
      }, {
        category: LogCategory.AUDIT
      });

    } catch (error) {
      request.status = 'rejected';
      await secureLogger.error('GDPR access request failed', {
        requestId,
        userId: request.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, {
        category: LogCategory.AUDIT
      });
    }
  }

  // Process erasure request (Right to be Forgotten)
  async processErasureRequest(requestId: string, adminUserId: string): Promise<void> {
    const request = this.gdprRequests.find(r => r.id === requestId);
    if (!request || request.requestType !== SubjectRights.ERASURE) {
      return;
    }

    request.status = 'in_progress';

    try {
      const supabase = await createServerSupabaseClient();
      
      // Check if erasure is legally permissible
      const canErase = await this.canEraseUserData(request.userId);
      if (!canErase.allowed) {
        request.status = 'rejected';
        request.responseData = { reason: canErase.reason };
        return;
      }

      // Perform data erasure
      const erasureResults: Record<string, unknown> = {};

      // Anonymize customer data (soft delete - replace with anonymous values)
      const { error: customerError } = await supabase
        .from('customers')
        .update({
          name: 'ERASED_USER',
          email: `erased_${request.userId}@example.com`,
          phone: null,
          address: null,
          company: null,
          company_name: 'ERASED',
          gdpr_erased: true,
          erased_at: new Date().toISOString()
        })
        .eq('id', request.userId);

      erasureResults.customer = customerError ? 'failed' : 'anonymized';

      // Mark user profile as erased
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          gdpr_erased: true,
          erased_at: new Date().toISOString()
        })
        .eq('id', request.userId);

      erasureResults.profile = profileError ? 'failed' : 'marked_erased';

      // Remove processing records after retention period
      this.dataProcessingRecords = this.dataProcessingRecords.filter(
        r => r.userId !== request.userId
      );

      request.status = 'completed';
      request.completedAt = Date.now();
      request.responseData = erasureResults;

      await secureLogger.info('GDPR erasure request completed', {
        requestId,
        userId: request.userId,
        adminUserId,
        erasureResults,
        completedAt: new Date().toISOString()
      }, {
        category: LogCategory.AUDIT
      });

    } catch (error) {
      request.status = 'rejected';
      await secureLogger.error('GDPR erasure request failed', {
        requestId,
        userId: request.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, {
        category: LogCategory.AUDIT
      });
    }
  }

  // Check if user data can be erased
  private async canEraseUserData(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const supabase = await createServerSupabaseClient();

    // Check for active contracts or legal obligations
    const { data: activeOrders } = await supabase
      .from('orders')
      .select('id, status, created_at')
      .eq('customer_id', userId)
      .in('status', ['pending', 'in_production', 'shipping']);

    if (activeOrders && activeOrders.length > 0) {
      return {
        allowed: false,
        reason: 'Active orders exist - data required for contract fulfillment'
      };
    }

    // Check for recent financial transactions (within legal retention period)
    const sevenYearsAgo = new Date();
    sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);

    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('customer_id', userId)
      .gte('created_at', sevenYearsAgo.toISOString());

    if (recentOrders && recentOrders.length > 0) {
      return {
        allowed: false,
        reason: 'Financial records must be retained for 7 years (legal obligation)'
      };
    }

    return { allowed: true };
  }

  // Data portability export
  async exportUserData(userId: string): Promise<any> {
    const request = await this.submitSubjectRightsRequest(
      userId,
      SubjectRights.DATA_PORTABILITY
    );

    // Process similar to access request but in portable format
    await this.processAccessRequest(request);
    
    const gdprRequest = this.gdprRequests.find(r => r.id === request);
    return gdprRequest?.responseData;
  }

  // Consent management
  async recordConsent(
    userId: string,
    purposes: string[],
    consentGiven: boolean
  ): Promise<void> {
    for (const purpose of purposes) {
      await this.recordDataProcessing(
        userId,
        DataCategory.PERSONAL_DATA,
        LawfulBasis.CONSENT,
        purpose,
        ['consent_record'],
        consentGiven
      );
    }

    await secureLogger.info('Consent recorded', {
      userId,
      purposes,
      consentGiven,
      timestamp: new Date().toISOString()
    }, {
      category: LogCategory.AUDIT
    });
  }

  // Data retention cleanup
  async performRetentionCleanup(): Promise<{
    recordsProcessed: number;
    recordsDeleted: number;
    errors: string[];
  }> {
    const now = Date.now();
    const errors: string[] = [];
    let recordsProcessed = 0;
    let recordsDeleted = 0;

    try {
      const supabase = await createServerSupabaseClient();

      // Process each retention policy
      for (const policy of this.retentionPolicies) {
        const cutoffDate = new Date(now - (policy.retentionPeriod * 24 * 60 * 60 * 1000));

        try {
          recordsProcessed++;

          if (policy.dataType === 'session_logs') {
            // Delete old session logs
            const { error } = await supabase
              .from('system_logs')
              .delete()
              .lt('created_at', cutoffDate.toISOString())
              .eq('category', 'session');

            if (error) {
              errors.push(`Failed to delete session logs: ${error.message}`);
            } else {
              recordsDeleted++;
            }
          }

          if (policy.dataType === 'marketing_data') {
            // Handle marketing data cleanup based on consent withdrawal
            const expiredConsent = this.dataProcessingRecords.filter(
              r => r.lawfulBasis === LawfulBasis.CONSENT &&
                   r.processingTimestamp < (now - (policy.retentionPeriod * 24 * 60 * 60 * 1000))
            );

            for (const record of expiredConsent) {
              // Remove expired consent-based processing records
              this.dataProcessingRecords = this.dataProcessingRecords.filter(
                r => r.id !== record.id
              );
              recordsDeleted++;
            }
          }

        } catch (error) {
          errors.push(`Error processing ${policy.dataType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      await secureLogger.info('GDPR retention cleanup completed', {
        recordsProcessed,
        recordsDeleted,
        errorCount: errors.length,
        timestamp: new Date().toISOString()
      }, {
        category: LogCategory.AUDIT
      });

    } catch (error) {
      errors.push(`Retention cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { recordsProcessed, recordsDeleted, errors };
  }

  // Helper methods
  private getRetentionPeriod(dataCategory: DataCategory): number {
    const policy = this.retentionPolicies.find(p => p.dataType === dataCategory);
    return policy?.retentionPeriod || 365; // Default 1 year
  }

  private sanitizeDataForExport(data: Record<string, unknown>): Record<string, unknown> {
    // Remove internal system fields from data export
    const sanitized = { ...data };
    delete sanitized.password;
    delete sanitized.password_hash;
    delete sanitized.internal_notes;
    delete sanitized.system_metadata;
    return sanitized;
  }

  // Get GDPR compliance status
  getComplianceStatus(): {
    totalProcessingRecords: number;
    consentBasedRecords: number;
    pendingRequests: number;
    completedRequests: number;
    nextCleanupDue: string;
  } {
    const consentRecords = this.dataProcessingRecords.filter(
      r => r.lawfulBasis === LawfulBasis.CONSENT
    ).length;

    const pendingRequests = this.gdprRequests.filter(
      r => r.status === 'pending' || r.status === 'in_progress'
    ).length;

    const completedRequests = this.gdprRequests.filter(
      r => r.status === 'completed'
    ).length;

    // Calculate next cleanup (weekly)
    const nextCleanup = new Date();
    nextCleanup.setDate(nextCleanup.getDate() + 7);

    return {
      totalProcessingRecords: this.dataProcessingRecords.length,
      consentBasedRecords: consentRecords,
      pendingRequests,
      completedRequests,
      nextCleanupDue: nextCleanup.toISOString()
    };
  }

  // Get user's GDPR requests
  getUserRequests(userId: string): GDPRRequest[] {
    return this.gdprRequests
      .filter(r => r.userId === userId)
      .sort((a, b) => b.submittedAt - a.submittedAt);
  }

  // Get all pending GDPR requests (admin view)
  getPendingRequests(): GDPRRequest[] {
    return this.gdprRequests
      .filter(r => r.status === 'pending' || r.status === 'in_progress')
      .sort((a, b) => a.submittedAt - b.submittedAt);
  }
}

// Middleware for automatic GDPR compliance
export function withGDPRCompliance<T extends unknown[]>(
  handler: (request: NextRequest, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const gdprManager = GDPRComplianceManager.getInstance();
    
    // Record data processing for requests that handle personal data
    const url = new URL(request.url);
    const isPersonalDataEndpoint = [
      '/api/customers',
      '/api/orders',
      '/api/profiles',
      '/api/auth'
    ].some(endpoint => url.pathname.startsWith(endpoint));

    if (isPersonalDataEndpoint && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const userId = request.headers.get('x-user-id');
      if (userId) {
        await gdprManager.recordDataProcessing(
          userId,
          DataCategory.PERSONAL_DATA,
          LawfulBasis.CONTRACT,
          `API access: ${request.method} ${url.pathname}`,
          ['api_request_data']
        );
      }
    }

    return handler(request, ...args);
  };
}

// Export singleton instance
export const gdprManager = GDPRComplianceManager.getInstance();