/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/services/shipping/seko-service.ts
import { createClient } from '@/lib/supabase/client';

// Helper function to get supabase client
const getSupabase = () => createClient();

// ============================================
// TYPES & INTERFACES
// ============================================

export interface SekoConfig {
  profileId: string;
  apiKey?: string;
  apiSecret?: string;
  environment: 'qa' | 'production';
  baseUrl: string;
}

export interface SekoAddress {
  name: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
  isResidential: boolean;
}

export interface SekoPackage {
  length: number;
  width: number;
  height: number;
  weight: number;
  packageType?: string;
  description?: string;
  value?: number;
  reference?: string;
}

export interface SekoQuoteRequest {
  profileId: string;
  shipFrom: SekoAddress;
  shipTo: SekoAddress;
  packages: SekoPackage[];
  shipDate?: string;
  serviceLevels?: string[];
  insuranceValue?: number;
  saturdayDelivery?: boolean;
  signatureRequired?: boolean;
}

export interface SekoQuoteResponse {
  quotes: Array<{
    carrierId: string;
    carrierName: string;
    serviceLevel: string;
    totalCost: number;
    baseCost: number;
    surcharges: Array<{
      type: string;
      amount: number;
      description: string;
    }>;
    transitDays: number;
    estimatedDelivery: string;
  }>;
  quoteId?: string;
  expiresAt?: string;
}

export interface SekoBookingRequest extends SekoQuoteRequest {
  customerOrderNumber: string;
  selectedCarrierId: string;
  selectedServiceLevel: string;
  reference1?: string;
  reference2?: string;
  specialInstructions?: string;
  labelFormat?: 'PDF' | 'ZPL' | 'PNG';
}

export interface SekoBookingResponse {
  sekoOrderId: string;
  customerOrderNumber: string;
  trackingNumber: string;
  masterTrackingNumber?: string;
  labels: Array<{
    format: string;
    data: string; // Base64 or URL
  }>;
  documents?: Array<{
    type: string;
    data: string;
  }>;
  estimatedDelivery: string;
  cost: number;
}

export interface SekoTrackingMilestone {
  milestoneCode: string;
  milestoneDescription: string;
  location?: string;
  date: string;
  carrierStatusCode?: string;
  carrierStatusDescription?: string;
  signature?: string;
  podUrl?: string;
  exceptionReason?: string;
}

export interface SekoPickupRequest {
  orderId: string;
  pickupDate: string;
  readyTime: string;
  closeTime: string;
  location: SekoAddress;
  numberOfPackages: number;
  totalWeight: number;
  specialInstructions?: string;
}

export interface SekoApiResponse {
  [key: string]: unknown;
}

export interface SekoBookingApiResponse {
  sekoOrderId: string;
  OrderId: string;
  CustomerOrderNumber: string;
  TrackingNumber: string;
  MasterTrackingNumber?: string;
  Labels?: Array<{ Format: string; Data: string }>;
  Documents?: Array<{ Type: string; Data: string }>;
  EstimatedDelivery: string;
  Cost: number;
}

export interface SekoPickupApiResponse {
  confirmationNumber: string;
  pickupDate: string;
  readyTime: string;
  driverName: string;
  driverPhone: string;
  status: string;
}

export interface SekoTrackingApiResponse {
  MilestoneCode: string;
  MilestoneDescription: string;
  Location?: string;
  Date: string;
  CarrierStatusCode?: string;
  CarrierStatusDescription?: string;
  Signature?: string;
  PodUrl?: string;
  ExceptionReason?: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  failure_count: number;
  is_active: boolean;
  events: string[];
}

export interface WebhookEvent {
  type: string;
  data: {
    orderId: string;
    status?: string;
    location?: string;
    estimatedDelivery?: string;
    milestoneCode?: string;
    description?: string;
    date?: string;
    carrierStatusCode?: string;
    carrierDescription?: string;
    deliveryDate?: string;
    signature?: string;
    podUrl?: string;
    reason?: string;
    resolution?: string;
  };
}

// ============================================
// SEKO API SERVICE CLASS
// ============================================

export class SekoShippingService {
  private config: SekoConfig;
  private mockMode: boolean = true; // Toggle for development

  constructor(config?: SekoConfig) {
    this.config = config || {
      profileId: process.env.NEXT_PUBLIC_SEKO_PROFILE_ID || 'LIMN_PROFILE',
      apiKey: process.env.SEKO_API_KEY,
      apiSecret: process.env.SEKO_API_SECRET,
      environment: (process.env.NEXT_PUBLIC_SEKO_ENV as 'qa' | 'production') || 'qa',
      baseUrl: process.env.NEXT_PUBLIC_SEKO_BASE_URL || 'https://qawebapi.myseko.com'
    };

    // Enable mock mode if no API credentials
    this.mockMode = !this.config.apiKey || !this.config.apiSecret;
  }

  // ============================================
  // AUTHENTICATION
  // ============================================

  private async getAuthHeaders(): Promise<Headers> {
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    
    if (!this.mockMode && this.config.apiKey && this.config.apiSecret) {
      // Real Seko authentication
      const auth = btoa(`${this.config.apiKey}:${this.config.apiSecret}`);
      headers.append('Authorization', `Basic ${auth}`);
    }
    
    return headers;
  }

  // ============================================
  // QUOTE/RATING
  // ============================================

  async getQuotes(request: SekoQuoteRequest): Promise<SekoQuoteResponse> {
    if (this.mockMode) {
      return this.getMockQuote();
    }

    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.config.baseUrl}/TMS/GetRates/${request.profileId}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(this.transformQuoteRequest(request))
        }
      );

      if (!response.ok) {
        throw new Error(`Seko API error: ${response.status}`);
      }

      const data = await response.json();
      return this.transformQuoteResponse(data);
    } catch (error) {
      console.error('Error getting quotes:', error);
      // Fallback to mock in case of error
      return this.getMockQuote();
    }
  }

  // ============================================
  // BOOKING/CREATING ORDERS
  // ============================================

  async bookShipment(request: SekoBookingRequest): Promise<SekoBookingResponse> {
    if (this.mockMode) {
      return this.getMockBooking(request);
    }

    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.config.baseUrl}/TMS/Order/Book/${request.profileId}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(this.transformBookingRequest(request))
        }
      );

      if (!response.ok) {
        throw new Error(`Seko API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Store in database
      await this.storeShipment(request, data);
      
      return this.transformBookingResponse(data);
    } catch (error) {
      console.error('Error booking shipment:', error);
      // Fallback to mock
      return this.getMockBooking(request);
    }
  }

  // ============================================
  // TRACKING
  // ============================================

  async trackShipment(customerOrderNumber: string): Promise<SekoTrackingMilestone[]> {
    if (this.mockMode) {
      return this.getMockTracking();
    }

    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.config.baseUrl}/TMS/Order/Track/${this.config.profileId}/${customerOrderNumber}`,
        {
          method: 'GET',
          headers
        }
      );

      if (!response.ok) {
        throw new Error(`Seko API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Store milestones in database
      await this.storeTrackingMilestones(customerOrderNumber, data);
      
      return this.transformTrackingResponse(data);
    } catch (error) {
      console.error('Error tracking shipment:', error);
      return this.getMockTracking();
    }
  }

  // ============================================
  // LABELS
  // ============================================

  async getLabels(customerOrderNumber: string): Promise<Array<{ format: string; data: string; url?: string }>> {
    if (this.mockMode) {
      return this.getMockLabels(customerOrderNumber);
    }

    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.config.baseUrl}/TMS/Order/Label/${this.config.profileId}/${customerOrderNumber}`,
        {
          method: 'GET',
          headers
        }
      );

      if (!response.ok) {
        throw new Error(`Seko API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting labels:', error);
      return this.getMockLabels(customerOrderNumber);
    }
  }

  // ============================================
  // PICKUP REQUESTS
  // ============================================

  async schedulePickup(request: SekoPickupRequest): Promise<SekoPickupApiResponse> {
    if (this.mockMode) {
      return this.getMockPickup(request);
    }

    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(
        `${this.config.baseUrl}/TMS/Order/Pickup`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(request)
        }
      );

      if (!response.ok) {
        throw new Error(`Seko API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Store pickup request
      await this.storePickupRequest(request, data);
      
      return data;
    } catch (error) {
      console.error('Error scheduling pickup:', error);
      return this.getMockPickup(request);
    }
  }

  // ============================================
  // DATABASE OPERATIONS
  // ============================================

  private async storeShipment(request: SekoBookingRequest, response: SekoBookingApiResponse) {
    const { error } = await getSupabase()
      .from('shipments')
      .insert({
        customer_order_number: request.customerOrderNumber,
        seko_order_id: response.sekoOrderId,
        profile_id: request.profileId,
        tracking_number: response.TrackingNumber,
        master_tracking_number: response.MasterTrackingNumber,
        status: 'booked',
        ship_from: request.shipFrom,
        ship_to: request.shipTo,
        packages: request.packages,
        carrier_id: request.selectedCarrierId,
        service_level: request.selectedServiceLevel,
        ship_date: request.shipDate,
        estimated_delivery: response.EstimatedDelivery,
        labels: response.Labels,
        documents: response.Documents,
        actual_cost: response.Cost,
        seko_response: response
      });

    if (error) {
      console.error('Error storing shipment:', error);
    }
  }

  private async storeTrackingMilestones(orderNumber: string, milestones: SekoTrackingMilestone[]) {
    // Get shipment ID
    const { data: shipment } = await getSupabase()
      .from('shipments')
      .select('id')
      .eq('customer_order_number', orderNumber)
      .single();

    if (!shipment) return;

    const milestonesToInsert = milestones.map((m: SekoTrackingMilestone) => ({
      shipment_id: shipment.id,
      milestone_code: m.milestoneCode,
      milestone_description: m.milestoneDescription,
      location: m.location,
      milestone_date: m.date,
      carrier_status_code: m.carrierStatusCode,
      carrier_status_description: m.carrierStatusDescription,
      signature: m.signature,
      pod_url: m.podUrl,
      exception_reason: m.exceptionReason,
      raw_data: m
    }));

    const { error } = await getSupabase()
      .from('tracking_milestones')
      .upsert(milestonesToInsert, {
        onConflict: 'shipment_id,milestone_code,milestone_date'
      });

    if (error) {
      console.error('Error storing tracking milestones:', error);
    }

    // Update shipment status based on latest milestone
    const latestMilestone = milestones[milestones.length - 1];
    await this.updateShipmentStatus(orderNumber, latestMilestone);
  }

  private async updateShipmentStatus(orderNumber: string, milestone: SekoTrackingMilestone) {
    let status = 'in_transit';
    
    // Map milestone codes to shipment status
    if (milestone.milestoneCode === 'DEL') {
      status = 'delivered';
    } else if (milestone.milestoneCode === 'OFD') {
      status = 'out_for_delivery';
    } else if (milestone.milestoneCode === 'EXC') {
      status = 'exception';
    }

    const { error } = await getSupabase()
      .from('shipments')
      .update({ 
        status,
        actual_delivery: milestone.milestoneCode === 'DEL' ? milestone.date : null
      })
      .eq('customer_order_number', orderNumber);

    if (error) {
      console.error('Error updating shipment status:', error);
    }
  }

  private async storePickupRequest(request: SekoPickupRequest, response: SekoPickupApiResponse) {
    const { error } = await getSupabase()
      .from('pickup_requests')
      .insert({
        shipment_id: request.orderId,
        pickup_date: request.pickupDate,
        ready_time: request.readyTime,
        close_time: request.closeTime,
        location: request.location,
        confirmation_number: response.confirmationNumber,
        status: 'scheduled',
        seko_pickup_response: response
      });

    if (error) {
      console.error('Error storing pickup request:', error);
    }
  }

  // ============================================
  // TRANSFORM FUNCTIONS (API <-> Internal)
  // ============================================

  private transformQuoteRequest(request: SekoQuoteRequest): SekoApiResponse {
    // Transform to Seko API format
    return {
      ShipFrom: this.transformAddress(request.shipFrom),
      ShipTo: this.transformAddress(request.shipTo),
      Packages: request.packages.map(p => ({
        Length: p.length,
        Width: p.width,
        Height: p.height,
        Weight: p.weight,
        PackageType: p.packageType || 'Package',
        Description: p.description,
        Value: p.value
      })),
      ShipDate: request.shipDate,
      ServiceLevels: request.serviceLevels,
      InsuranceValue: request.insuranceValue,
      SaturdayDelivery: request.saturdayDelivery,
      SignatureRequired: request.signatureRequired
    };
  }

  private transformAddress(address: SekoAddress): Record<string, unknown> {
    return {
      Name: address.name,
      Company: address.company,
      Address1: address.address1,
      Address2: address.address2,
      City: address.city,
      State: address.state,
      PostalCode: address.postalCode,
      Country: address.country,
      Phone: address.phone,
      Email: address.email,
      IsResidential: address.isResidential
    };
  }

  private transformQuoteResponse(response: { Quotes?: Array<{ CarrierId: string; CarrierName: string; ServiceLevel: string; TotalCost: number; BaseCost: number; Surcharges?: Array<{ Type: string; Amount: number; Description: string }>; TransitDays: number; EstimatedDelivery: string }>; QuoteId?: string; ExpiresAt?: string }): SekoQuoteResponse {
    return {
      quotes: response.Quotes?.map((q) => ({
        carrierId: q.CarrierId,
        carrierName: q.CarrierName,
        serviceLevel: q.ServiceLevel,
        totalCost: q.TotalCost,
        baseCost: q.BaseCost,
        surcharges: q.Surcharges?.map((s) => ({
          type: s.Type,
          amount: s.Amount,
          description: s.Description
        })) || [],
        transitDays: q.TransitDays,
        estimatedDelivery: q.EstimatedDelivery
      })) || [],
      quoteId: response.QuoteId,
      expiresAt: response.ExpiresAt
    };
  }

  private transformBookingRequest(request: SekoBookingRequest): SekoApiResponse {
    const quoteRequest = this.transformQuoteRequest(request);
    return {
      ...quoteRequest,
      CustomerOrderNumber: request.customerOrderNumber,
      CarrierId: request.selectedCarrierId,
      ServiceLevel: request.selectedServiceLevel,
      Reference1: request.reference1,
      Reference2: request.reference2,
      SpecialInstructions: request.specialInstructions,
      LabelFormat: request.labelFormat || 'PDF'
    };
  }

  private transformBookingResponse(response: SekoBookingApiResponse): SekoBookingResponse {
    return {
      sekoOrderId: response.OrderId,
      customerOrderNumber: response.CustomerOrderNumber,
      trackingNumber: response.TrackingNumber,
      masterTrackingNumber: response.MasterTrackingNumber,
      labels: response.Labels?.map((l) => ({
        format: l.Format,
        data: l.Data
      })) || [],
      documents: response.Documents?.map((d) => ({
        type: d.Type,
        data: d.Data
      })) || [],
      estimatedDelivery: response.EstimatedDelivery,
      cost: response.Cost
    };
  }

  private transformTrackingResponse(response: SekoTrackingApiResponse[]): SekoTrackingMilestone[] {
    return response.map((m) => ({
      milestoneCode: m.MilestoneCode,
      milestoneDescription: m.MilestoneDescription,
      location: m.Location,
      date: m.Date,
      carrierStatusCode: m.CarrierStatusCode,
      carrierStatusDescription: m.CarrierStatusDescription,
      signature: m.Signature,
      podUrl: m.PodUrl,
      exceptionReason: m.ExceptionReason
    }));
  }

  // ============================================
  // MOCK DATA GENERATORS
  // ============================================

  private getMockQuote(): SekoQuoteResponse {
    const baseRate = Math.random() * 50 + 25;
    return {
      quotes: [
        {
          carrierId: 'ups',
          carrierName: 'UPS',
          serviceLevel: 'Ground',
          totalCost: baseRate,
          baseCost: baseRate * 0.8,
          surcharges: [
            { type: 'fuel', amount: baseRate * 0.15, description: 'Fuel Surcharge' },
            { type: 'residential', amount: baseRate * 0.05, description: 'Residential Delivery' }
          ],
          transitDays: 5,
          estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          carrierId: 'fedex',
          carrierName: 'FedEx',
          serviceLevel: '2Day',
          totalCost: baseRate * 1.5,
          baseCost: baseRate * 1.2,
          surcharges: [
            { type: 'fuel', amount: baseRate * 0.2, description: 'Fuel Surcharge' },
            { type: 'residential', amount: baseRate * 0.1, description: 'Residential Delivery' }
          ],
          transitDays: 2,
          estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ],
      quoteId: `QUOTE-${Date.now()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
  }

  private getMockBooking(request: SekoBookingRequest): SekoBookingResponse {
    const trackingNumber = `LIMN${Date.now()}`;
    return {
      sekoOrderId: `SEKO-${Date.now()}`,
      customerOrderNumber: request.customerOrderNumber,
      trackingNumber,
      masterTrackingNumber: trackingNumber,
      labels: [{
        format: 'PDF',
        data: 'base64_encoded_pdf_data_here'
      }],
      documents: [],
      estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      cost: Math.random() * 50 + 25
    };
  }

  private getMockTracking(): SekoTrackingMilestone[] {
    const now = new Date();
    const milestones: SekoTrackingMilestone[] = [
      {
        milestoneCode: 'PU',
        milestoneDescription: 'Picked Up',
        location: 'San Francisco, CA',
        date: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        carrierStatusCode: 'PU',
        carrierStatusDescription: 'Package picked up'
      },
      {
        milestoneCode: 'IT',
        milestoneDescription: 'In Transit',
        location: 'Sacramento, CA',
        date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        carrierStatusCode: 'IT',
        carrierStatusDescription: 'Package in transit'
      },
      {
        milestoneCode: 'IT',
        milestoneDescription: 'In Transit',
        location: 'Reno, NV',
        date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        carrierStatusCode: 'IT',
        carrierStatusDescription: 'Package in transit'
      },
      {
        milestoneCode: 'IT',
        milestoneDescription: 'In Transit',
        location: 'Salt Lake City, UT',
        date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        carrierStatusCode: 'IT',
        carrierStatusDescription: 'Package in transit'
      },
      {
        milestoneCode: 'OFD',
        milestoneDescription: 'Out for Delivery',
        location: 'Denver, CO',
        date: now.toISOString(),
        carrierStatusCode: 'OFD',
        carrierStatusDescription: 'Package out for delivery'
      }
    ];

    // Randomly add delivery milestone
    if (Math.random() > 0.5) {
      milestones.push({
        milestoneCode: 'DEL',
        milestoneDescription: 'Delivered',
        location: 'Denver, CO',
        date: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
        carrierStatusCode: 'DEL',
        carrierStatusDescription: 'Package delivered',
        signature: 'John Doe',
        podUrl: 'https://example.com/pod/12345.pdf'
      });
    }

    return milestones;
  }

  private getMockLabels(orderNumber: string): Array<{ format: string; data: string; url: string }> {
    return [{
      format: 'PDF',
      data: 'base64_encoded_label_data',
      url: `https://example.com/labels/${orderNumber}.pdf`
    }];
  }

  private getMockPickup(request: SekoPickupRequest): SekoPickupApiResponse {
    return {
      confirmationNumber: `PU-${Date.now()}`,
      pickupDate: request.pickupDate,
      readyTime: request.readyTime,
      driverName: 'John Driver',
      driverPhone: '555-0123',
      status: 'Scheduled'
    };
  }
}

// ============================================
// PRODUCTION TRACKING SERVICE
// ============================================

export class ProductionTrackingService {
  // Update production stage
  async updateProductionStage(
    orderItemId: string, 
    stageId: string, 
    notes?: string
  ): Promise<void> {
    const { data: tracking } = await getSupabase()
      .from('production_tracking')
      .select('id')
      .eq('order_item_id', orderItemId)
      .single();

    if (!tracking) {
      // Create new tracking record
      await getSupabase()
        .from('production_tracking')
        .insert({
          order_item_id: orderItemId,
          current_stage_id: stageId
        });
    } else {
      // Update existing tracking
      await getSupabase()
        .from('production_tracking')
        .update({ 
          current_stage_id: stageId,
          updated_at: new Date().toISOString()
        })
        .eq('id', tracking.id);

      // Add to history
      await getSupabase()
        .from('production_stage_history')
        .insert({
          production_tracking_id: tracking.id,
          stage_id: stageId,
          notes
        });

      // Create event
      await getSupabase()
        .from('production_events')
        .insert({
          production_tracking_id: tracking.id,
          event_type: 'stage_change',
          title: 'Production Stage Updated',
          description: notes
        });
    }
  }

  // Get production status for an order
  async getOrderProductionStatus(orderId: string): Promise<unknown[]> {
    const { data } = await getSupabase()
      .from('production_status')
      .select('*')
      .eq('order_id', orderId);

    return data || [];
  }

  // Add production event
  async addProductionEvent(
    trackingId: string,
    eventType: string,
    title: string,
    description?: string,
    severity: 'info' | 'warning' | 'error' = 'info'
  ): Promise<void> {
    await getSupabase()
      .from('production_events')
      .insert({
        production_tracking_id: trackingId,
        event_type: eventType,
        title,
        description,
        severity
      });
  }

  // Get production timeline
  async getProductionTimeline(orderItemId: string): Promise<unknown[]> {
    const { data: tracking } = await getSupabase()
      .from('production_tracking')
      .select('id')
      .eq('order_item_id', orderItemId)
      .single();

    if (!tracking) return [];

    const { data: history } = await getSupabase()
      .from('production_stage_history')
      .select(`
        *,
        stage:production_stages(*)
      `)
      .eq('production_tracking_id', tracking.id)
      .order('entered_at', { ascending: true });

    return history || [];
  }
}

// ============================================
// WEBHOOK HANDLER
// ============================================

export class ShippingWebhookHandler {
  // Handle incoming Seko webhooks
  async handleSekoWebhook(event: WebhookEvent): Promise<void> {
    console.log('Received Seko webhook:', event);

    switch (event.type) {
      case 'shipment.status.updated':
        await this.handleStatusUpdate(event.data);
        break;
      case 'tracking.milestone.added':
        await this.handleNewMilestone(event.data);
        break;
      case 'delivery.completed':
        await this.handleDeliveryCompleted(event.data);
        break;
      case 'exception.occurred':
        await this.handleException(event.data);
        break;
      default:
        console.log('Unknown webhook event type:', event.type);
    }
  }

  private async handleStatusUpdate(data: WebhookEvent['data']): Promise<void> {
    // Update shipment status in database
    await getSupabase()
      .from('shipments')
      .update({ 
        status: data.status,
        updated_at: new Date().toISOString()
      })
      .eq('seko_order_id', data.orderId);

    // Notify customer
    await this.notifyCustomer(data.orderId, 'shipping_update', {
      status: data.status,
      location: data.location,
      estimatedDelivery: data.estimatedDelivery
    });
  }

  private async handleNewMilestone(data: WebhookEvent['data']): Promise<void> {
    // Get shipment
    const { data: shipment } = await getSupabase()
      .from('shipments')
      .select('id')
      .eq('seko_order_id', data.orderId)
      .single();

    if (!shipment) return;

    // Insert milestone
    await getSupabase()
      .from('tracking_milestones')
      .insert({
        shipment_id: shipment.id,
        milestone_code: data.milestoneCode,
        milestone_description: data.description,
        location: data.location,
        milestone_date: data.date,
        carrier_status_code: data.carrierStatusCode,
        carrier_status_description: data.carrierDescription
      });
  }

  private async handleDeliveryCompleted(data: WebhookEvent['data']): Promise<void> {
    // Update shipment
    await getSupabase()
      .from('shipments')
      .update({
        status: 'delivered',
        actual_delivery: data.deliveryDate
      })
      .eq('seko_order_id', data.orderId);

    // Notify customer
    await this.notifyCustomer(data.orderId, 'delivery_update', {
      deliveredAt: data.deliveryDate,
      signature: data.signature,
      podUrl: data.podUrl
    });
  }

  private async handleException(data: WebhookEvent['data']): Promise<void> {
    // Update shipment status
    await getSupabase()
      .from('shipments')
      .update({
        status: 'exception'
      })
      .eq('seko_order_id', data.orderId);

    // Create production event
    const { data: shipment } = await getSupabase()
      .from('shipments')
      .select('order_id')
      .eq('seko_order_id', data.orderId)
      .single();

    if (shipment) {
      await getSupabase()
        .from('production_events')
        .insert({
          event_type: 'issue',
          title: 'Shipping Exception',
          description: data.reason,
          severity: 'warning',
          data: { exception: data }
        });
    }

    // Notify customer
    await this.notifyCustomer(data.orderId, 'delay_notice', {
      reason: data.reason,
      resolution: data.resolution
    });
  }

  private async notifyCustomer(
    orderId: string, 
    type: string, 
    data: Record<string, unknown>
  ): Promise<void> {
    // Get order and client info
    const { data: shipment } = await getSupabase()
      .from('shipments')
      .select(`
        order_id,
        orders!inner(
          client_id,
          clients!inner(*)
        )
      `)
      .eq('seko_order_id', orderId)
      .single();

    if (!shipment) return;

    // Create notification
    await getSupabase()
      .from('customer_notifications')
      .insert({
        client_id: (shipment as any).orders.client_id,
        order_id: shipment.order_id,
        type,
        subject: this.getNotificationSubject(type),
        message: this.getNotificationMessage(type, data),
        data,
        channel: 'portal'
      });

    // Send to webhook endpoints if configured
    const { data: endpoints } = await getSupabase()
      .from('webhook_endpoints')
      .select('*')
      .eq('client_id', (shipment as any).orders.client_id)
      .eq('is_active', true)
      .contains('events', [type]);

    for (const endpoint of endpoints || []) {
      await this.sendWebhook(endpoint, {
        event: type,
        orderId: shipment.order_id,
        data
      });
    }
  }

  private getNotificationSubject(type: string): string {
    const subjects: Record<string, string> = {
      'shipping_update': 'Your Order Has Shipped',
      'delivery_update': 'Your Order Has Been Delivered',
      'delay_notice': 'Shipping Delay Notice',
      'production_update': 'Production Update'
    };
    return subjects[type] || 'Order Update';
  }

  private getNotificationMessage(type: string, data: Record<string, unknown>): string {
    switch (type) {
      case 'shipping_update':
        return `Your order is now ${data.status}. Current location: ${data.location}. Estimated delivery: ${data.estimatedDelivery}`;
      case 'delivery_update':
        return `Your order was delivered on ${data.deliveredAt}. ${data.signature ? `Signed by: ${data.signature}` : ''}`;
      case 'delay_notice':
        return `There has been a delay with your shipment. Reason: ${data.reason}. ${data.resolution || 'We are working to resolve this issue.'}`;
      default:
        return 'Your order has been updated. Please check the portal for details.';
    }
  }

  private async sendWebhook(endpoint: WebhookEndpoint, payload: Record<string, unknown>): Promise<void> {
    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': this.generateSignature()
        },
        body: JSON.stringify(payload)
      });

      // Log delivery
      await getSupabase()
        .from('webhook_deliveries')
        .insert({
          endpoint_id: endpoint.id,
          event_type: payload.event,
          payload,
          response_status: response.status,
          delivered_at: response.ok ? new Date().toISOString() : null
        });

      // Update endpoint health
      if (response.ok) {
        await getSupabase()
          .from('webhook_endpoints')
          .update({
            last_success: new Date().toISOString(),
            failure_count: 0
          })
          .eq('id', endpoint.id);
      } else {
        await getSupabase()
          .from('webhook_endpoints')
          .update({
            last_failure: new Date().toISOString(),
            failure_count: endpoint.failure_count + 1
          })
          .eq('id', endpoint.id);
      }
    } catch (error) {
      console.error('Webhook delivery failed:', error);
    }
  }

  private generateSignature(): string {
    // Implement HMAC signature generation
    // This is a placeholder - implement actual HMAC-SHA256
    return 'signature_placeholder';
  }
}

// Export singleton instances
export const sekoService = new SekoShippingService();
export const productionService = new ProductionTrackingService();
export const webhookHandler = new ShippingWebhookHandler();