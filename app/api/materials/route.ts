/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requirePermissions } from '@/lib/permissions/rbac'

// TypeScript interfaces for the cascading materials structure
interface FabricHierarchy {
  fabric_brands: Array<{
    id: string;
    name: string;
    description?: string;
    price_modifier: number;
    active: boolean;
    collections: Array<{
      id: string;
      name: string;
      description?: string;
      price_modifier: number;
      colors: Array<{
        id: string;
        name: string;
        price_modifier: number;
      }>;
    }>;
  }>;
}

interface WoodHierarchy {
  wood_types: Array<{
    id: string;
    name: string;
    description?: string;
    price_modifier: number;
    active: boolean;
    finishes: Array<{
      id: string;
      name: string;
      description?: string;
      price_modifier: number;
    }>;
  }>;
}

interface MetalHierarchy {
  metal_types: Array<{
    id: string;
    name: string;
    description?: string;
    price_modifier: number;
    active: boolean;
    finishes: Array<{
      id: string;
      name: string;
      description?: string;
      price_modifier: number;
      colors: Array<{
        id: string;
        name: string;
        price_modifier: number;
      }>;
    }>;
  }>;
}

interface StoneHierarchy {
  stone_types: Array<{
    id: string;
    name: string;
    description?: string;
    price_modifier: number;
    active: boolean;
    finishes: Array<{
      id: string;
      name: string;
      description?: string;
      price_modifier: number;
    }>;
  }>;
}

interface WeavingHierarchy {
  weaving_materials: Array<{
    id: string;
    name: string;
    description?: string;
    price_modifier: number;
    active: boolean;
    patterns: Array<{
      id: string;
      name: string;
      description?: string;
      price_modifier: number;
      colors: Array<{
        id: string;
        name: string;
        price_modifier: number;
      }>;
    }>;
  }>;
}

interface CarvingOptions {
  carving_styles: Array<{
    id: string;
    name: string;
    description?: string;
    complexity_level: number;
    price_modifier: number;
    active: boolean;
  }>;
}

interface MaterialsData extends FabricHierarchy, WoodHierarchy, MetalHierarchy, StoneHierarchy, WeavingHierarchy, CarvingOptions {}

export async function GET(request: NextRequest) {
  try {
    console.log('Materials API: Starting materials fetch...')

    const authResult = await requirePermissions(request, ['materials.read'])
    if (!authResult.valid) {
      return NextResponse.json(
        { error: authResult.error || 'Unauthorized' },
        { status: authResult.statusCode || 401 }
      )
    }

    const supabase = await createServerSupabaseClient()

    console.log('Materials API: Querying new cascading database structure...')

    // Query all material categories in parallel using the new cascading structure
    const [
      fabricBrandsResult,
      fabricCollectionsResult,
      fabricColorsResult,
      woodTypesResult,
      woodFinishesResult,
      metalTypesResult,
      metalFinishesResult,
      metalColorsResult,
      stoneTypesResult,
      stoneFinishesResult,
      weavingMaterialsResult,
      weavingPatternsResult,
      weavingColorsResult,
      carvingStylesResult
    ] = await Promise.all([
      // Fabric hierarchy
      supabase.from('fabric_brands').select('*').order('name'),
      supabase.from('fabric_collections').select('*').order('name'),
      supabase.from('fabric_colors').select('*').order('name'),
      
      // Wood hierarchy
      supabase.from('wood_types').select('*').order('name'),
      supabase.from('wood_finishes').select('*').order('name'),
      
      // Metal hierarchy
      supabase.from('metal_types').select('*').order('name'),
      supabase.from('metal_finishes').select('*').order('name'),
      supabase.from('metal_colors').select('*').order('name'),
      
      // Stone hierarchy
      supabase.from('stone_types').select('*').order('name'),
      supabase.from('stone_finishes').select('*').order('name'),
      
      // Weaving hierarchy
      supabase.from('weaving_materials').select('*').order('name'),
      supabase.from('weaving_patterns').select('*').order('name'),
      supabase.from('weaving_colors').select('*').order('name'),
      
      // Carving styles
      supabase.from('carving_styles').select('*').order('complexity_level', { ascending: true })
    ])

    // Check for any query errors
    const errors = [
      fabricBrandsResult.error,
      fabricCollectionsResult.error,
      woodTypesResult.error,
      metalTypesResult.error,
      stoneTypesResult.error,
      weavingMaterialsResult.error,
      carvingStylesResult.error
    ].filter(Boolean)

    if (errors.length > 0) {
      console.error('Materials API: Database query errors:', errors)
      return NextResponse.json({ error: 'Failed to fetch materials from database', details: errors }, { status: 500 })
    }

    // Extract data from results
    const fabricBrands = fabricBrandsResult.data || []
    const fabricCollections = fabricCollectionsResult.data || []
    const fabricColors = fabricColorsResult.data || []
    const woodTypes = woodTypesResult.data || []
    const woodFinishes = woodFinishesResult.data || []
    const metalTypes = metalTypesResult.data || []
    const metalFinishes = metalFinishesResult.data || []
    const metalColors = metalColorsResult.data || []
    const stoneTypes = stoneTypesResult.data || []
    const stoneFinishes = stoneFinishesResult.data || []
    const weavingMaterials = weavingMaterialsResult.data || []
    const weavingPatterns = weavingPatternsResult.data || []
    const weavingColors = weavingColorsResult.data || []
    const carvingStyles = carvingStylesResult.data || []

    console.log('Materials API: Database query results:', {
      fabric_brands: fabricBrands.length,
      fabric_collections: fabricCollections.length,
      fabric_colors: fabricColors.length,
      wood_types: woodTypes.length,
      wood_finishes: woodFinishes.length,
      metal_types: metalTypes.length,
      metal_finishes: metalFinishes.length,
      metal_colors: metalColors.length,
      stone_types: stoneTypes.length,
      stone_finishes: stoneFinishes.length,
      weaving_materials: weavingMaterials.length,
      weaving_patterns: weavingPatterns.length,
      weaving_colors: weavingColors.length,
      carving_styles: carvingStyles.length
    })

    // Build the cascading structure
    
    // Fabric Hierarchy: Brand → Collection → Color
    const fabricHierarchy: FabricHierarchy['fabric_brands'] = fabricBrands
      .filter((brand: any) => brand.active !== false)
      .map((brand: any) => ({
        id: brand.id,
        name: brand.name,
        description: brand.description,
        price_modifier: brand.price_modifier || 0,
        active: brand.active,
        collections: fabricCollections
          .filter((collection: any) => collection.brand_id === brand.id && collection.active !== false)
          .map((collection: any) => ({
            id: collection.id,
            name: collection.name,
            description: collection.description,
            price_modifier: collection.price_modifier || 0,
            colors: fabricColors
              .filter((color: any) => color.collection_id === collection.id && color.active !== false)
              .map((color: any) => ({
                id: color.id,
                name: color.name,
                price_modifier: color.price_modifier || 0
              }))
          }))
      }))

    // Wood Hierarchy: Type → Finish
    const woodHierarchy: WoodHierarchy['wood_types'] = woodTypes
      .filter((type: any) => type.active !== false)
      .map((type: any) => ({
        id: type.id,
        name: type.name,
        description: type.description,
        price_modifier: type.price_modifier || 0,
        active: type.active,
        finishes: woodFinishes
          .filter((finish: any) => finish.wood_type_id === type.id && finish.active !== false)
          .map((finish: any) => ({
            id: finish.id,
            name: finish.name,
            description: finish.description,
            price_modifier: finish.price_modifier || 0
          }))
      }))

    // Metal Hierarchy: Type → Finish → Color
    const metalHierarchy: MetalHierarchy['metal_types'] = metalTypes
      .filter((type: any) => type.active !== false)
      .map((type: any) => ({
        id: type.id,
        name: type.name,
        description: type.description,
        price_modifier: type.price_modifier || 0,
        active: type.active,
        finishes: metalFinishes
          .filter((finish: any) => finish.metal_type_id === type.id && finish.active !== false)
          .map((finish: any) => ({
            id: finish.id,
            name: finish.name,
            description: finish.description,
            price_modifier: finish.price_modifier || 0,
            colors: metalColors
              .filter((color: any) => color.finish_id === finish.id && color.active !== false)
              .map((color: any) => ({
                id: color.id,
                name: color.name,
                price_modifier: color.price_modifier || 0
              }))
          }))
      }))

    // Stone Hierarchy: Type → Finish
    const stoneHierarchy: StoneHierarchy['stone_types'] = stoneTypes
      .filter((type: any) => type.active !== false)
      .map((type: any) => ({
        id: type.id,
        name: type.name,
        description: type.description,
        price_modifier: type.price_modifier || 0,
        active: type.active,
        finishes: stoneFinishes
          .filter((finish: any) => finish.stone_type_id === type.id && finish.active !== false)
          .map((finish: any) => ({
            id: finish.id,
            name: finish.name,
            description: finish.description,
            price_modifier: finish.price_modifier || 0
          }))
      }))

    // Weaving Hierarchy: Material → Pattern → Color
    const weavingHierarchy: WeavingHierarchy['weaving_materials'] = weavingMaterials
      .filter((material: any) => material.active !== false)
      .map((material: any) => ({
        id: material.id,
        name: material.name,
        description: material.description,
        price_modifier: material.price_modifier || 0,
        active: material.active,
        patterns: weavingPatterns
          .filter((pattern: any) => pattern.material_id === material.id && pattern.active !== false)
          .map((pattern: any) => ({
            id: pattern.id,
            name: pattern.name,
            description: pattern.description,
            price_modifier: pattern.price_modifier || 0,
            colors: weavingColors
              .filter((color: any) => color.pattern_id === pattern.id && color.active !== false)
              .map((color: any) => ({
                id: color.id,
                name: color.name,
                price_modifier: color.price_modifier || 0
              }))
          }))
      }))

    // Carving Styles (flat structure)
    const carvingHierarchy: CarvingOptions['carving_styles'] = carvingStyles
      .filter((style: any) => style.active !== false)
      .map((style: any) => ({
        id: style.id,
        name: style.name,
        description: style.description,
        complexity_level: style.complexity_level || 1,
        price_modifier: style.price_modifier || 0,
        active: style.active
      }))

    const materialsData: MaterialsData = {
      fabric_brands: fabricHierarchy,
      wood_types: woodHierarchy,
      metal_types: metalHierarchy,
      stone_types: stoneHierarchy,
      weaving_materials: weavingHierarchy,
      carving_styles: carvingHierarchy
    }

    console.log('Materials API: Successfully built cascading structure:', {
      fabric_brands_with_collections: materialsData.fabric_brands.length,
      total_fabric_collections: materialsData.fabric_brands.reduce((acc, brand) => acc + brand.collections.length, 0),
      total_fabric_colors: materialsData.fabric_brands.reduce((acc, brand) => 
        acc + brand.collections.reduce((acc2, collection) => acc2 + collection.colors.length, 0), 0),
      wood_types_with_finishes: materialsData.wood_types.length,
      total_wood_finishes: materialsData.wood_types.reduce((acc, type) => acc + type.finishes.length, 0),
      metal_types_with_finishes: materialsData.metal_types.length,
      total_metal_colors: materialsData.metal_types.reduce((acc, type) => 
        acc + type.finishes.reduce((acc2, finish) => acc2 + finish.colors.length, 0), 0),
      stone_types_with_finishes: materialsData.stone_types.length,
      weaving_materials_with_patterns: materialsData.weaving_materials.length,
      carving_styles: materialsData.carving_styles.length
    })

    return NextResponse.json({
      data: materialsData,
      success: true,
      message: 'Cascading materials structure loaded successfully'
    })

  } catch (error) {
    console.error('Materials API Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to load materials',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}