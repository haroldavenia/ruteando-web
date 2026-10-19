import { SessionResponse, UserProfile } from '../../auth/session.model';
import {
  AssignedService,
  Journey,
  JourneyMetrics,
  JourneyNavigation,
  JourneyRoute,
  MasterDomain,
  MasterDomainValue,
  Package,
  Place,
  Resource,
  ResourceType,
  Settings,
  User,
  Waypoint,
  Zone,
} from './index';

import places from '../../../../testing/fixtures/gateway/get__places.json';
import zones from '../../../../testing/fixtures/gateway/get__zones.json';
import resourceTypes from '../../../../testing/fixtures/gateway/get__resource-types.json';
import resources from '../../../../testing/fixtures/gateway/get__resources.json';
import settings from '../../../../testing/fixtures/gateway/get__settings__id.json';
import packages from '../../../../testing/fixtures/gateway/get__packages.json';
import masterDomains from '../../../../testing/fixtures/gateway/get__master-domains.json';
import plan from '../../../../testing/fixtures/gateway/post__journeys__plan.json';
import metrics from '../../../../testing/fixtures/gateway/get__journeys__journeyId__metrics.json';
import navigations from '../../../../testing/fixtures/gateway/get__journeys__journeyId__navigations.json';
import assigned from '../../../../testing/fixtures/gateway/get__assigned-services.json';
import users from '../../../../testing/fixtures/gateway/get__users.json';
import login from '../../../../testing/fixtures/gateway/post__auth__login.json';

/**
 * `Record<keyof T, true>` obliga a listar TODAS las claves del modelo (si el tipo cambia, esto no
 * compila); la comparación con el ejemplo capturado obliga a que el modelo y el gateway coincidan.
 */
function keys<T>(model: Record<keyof T, true>): string[] {
  return Object.keys(model).sort();
}
function actual(sample: unknown): string[] {
  return Object.keys(sample as object).sort();
}
const firstOf = (page: { response: { body: unknown } }) => (page.response.body as { content: unknown[] }).content[0];

describe('los modelos coinciden con los ejemplos reales del gateway', () => {
  it('Place', () => {
    const model: Record<keyof Place, true> = { id: true, tenantId: true, name: true, type: true, address: true, location: true, phoneNumber: true, contactName: true, zoneId: true, active: true, createdAt: true, updatedAt: true };
    expect(actual(firstOf(places))).toEqual(keys<Place>(model));
  });

  it('Zone', () => {
    const model: Record<keyof Zone, true> = { id: true, tenantId: true, name: true, code: true, boundary: true, color: true, active: true, createdAt: true, updatedAt: true };
    expect(actual((zones.response.body as unknown[])[0])).toEqual(keys<Zone>(model));
  });

  it('ResourceType', () => {
    const model: Record<keyof ResourceType, true> = { id: true, tenantId: true, category: true, name: true, osrmProfile: true, capacity: true, measure: true, restriction: true, gasMileage: true, active: true, createdAt: true, updatedAt: true };
    expect(actual(firstOf(resourceTypes))).toEqual(keys<ResourceType>(model));
  });

  it('Resource', () => {
    const model: Record<keyof Resource, true> = { id: true, tenantId: true, resourceTypeId: true, driverId: true, name: true, licensePlate: true, depotId: true, shiftStartUtc: true, shiftDurationSec: true, breakDurationSec: true, quantity: true, default: true, active: true, createdAt: true, updatedAt: true, allowedPackageTypes: true, allowedZoneIds: true, resourceType: true, assignedUser: true };
    expect(actual(firstOf(resources))).toEqual(keys<Resource>(model));
  });

  it('Settings', () => {
    const model: Record<keyof Settings, true> = { id: true, tenantId: true, description: true, routeTopology: true, restrictionType: true, placeStartId: true, placeEndId: true, evaluateWeight: true, evaluateVolume: true, evaluateItineraryZone: true, fixedRoutes: true, lengthOfStay: true, typeLengthOfStay: true, shiftStartUtc: true, shiftDurationSec: true, breakDurationSec: true, resourceIds: true, active: true, createdAt: true, updatedAt: true, createdBy: true, globalShiftActive: true, globalBreakActive: true, placeStart: true, placeEnd: true, resources: true };
    expect(actual(settings.response.body)).toEqual(keys<Settings>(model));
  });

  it('Package', () => {
    const model: Record<keyof Package, true> = { id: true, tenantId: true, guideNumber: true, name: true, serviceType: true, address: true, standardizedAddress: true, location: true, geocodingScore: true, geocodingStatus: true, city: true, country: true, postalCode: true, zoneId: true, weight: true, volume: true, pieceNumber: true, measure: true, durationStay: true, timeWindow: true, category: true, goodsTags: true, customerId: true, receiver: true, sender: true, observation: true, status: true, createdAt: true, updatedAt: true };
    expect(actual(firstOf(packages))).toEqual(keys<Package>(model));
  });

  it('MasterDomain y MasterDomainValue', () => {
    const domain: Record<keyof MasterDomain, true> = { id: true, code: true, description: true, system: true, values: true };
    const value: Record<keyof MasterDomainValue, true> = { key: true, label: true, description: true, sortOrder: true, active: true };
    const first = (masterDomains.response.body as { values: unknown[] }[])[0];
    expect(actual(first)).toEqual(keys<MasterDomain>(domain));
    expect(actual(first.values[0])).toEqual(keys<MasterDomainValue>(value));
  });

  it('Journey, JourneyRoute y Waypoint', () => {
    const journey: Record<keyof Journey, true> = { id: true, tenantId: true, createdBy: true, settingsId: true, settings: true, name: true, status: true, totalServices: true, totalResources: true, totalZones: true, stats: true, invalidPackageIds: true, routes: true, resourceSummary: true, createdAt: true, updatedAt: true };
    const route: Record<keyof JourneyRoute, true> = { routeIndex: true, name: true, resourceId: true, resource: true, geoJson: true, startRouteUtc: true, finishRouteUtc: true, distanceTraveled: true, duration: true, weightUsed: true, volumeUsed: true, weightUsagePercent: true, volumeUsagePercent: true, fuelCost: true, avgStayTime: true, legsCount: true, badPackageIds: true, waypoints: true };
    const waypoint: Record<keyof Waypoint, true> = { sequence: true, stopType: true, packageId: true, packageInfo: true, placeId: true, coordinates: true, arrivalUtc: true, departureUtc: true, distance: true, distanceAccum: true, duration: true, durationAccum: true, weight: true, weightAccum: true, volume: true, volumeAccum: true };
    const body = plan.response.body as unknown as { routes: { waypoints: unknown[] }[] };
    expect(actual(body)).toEqual(keys<Journey>(journey));
    expect(actual(body.routes[0])).toEqual(keys<JourneyRoute>(route));
    expect(actual(body.routes[0].waypoints[0])).toEqual(keys<Waypoint>(waypoint));
  });

  it('JourneyMetrics y JourneyNavigation', () => {
    const m: Record<keyof JourneyMetrics, true> = { id: true, tenantId: true, journeyId: true, distance: true, efficiency: true, weightAccum: true, volumeAccum: true, avgAttendWeightPct: true, avgAttendVolumePct: true, attendServicesPct: true, attendedRoutes: true, attendedServices: true, totalServices: true, usedResources: true, totalResources: true, attendedCustomers: true, createdAt: true };
    const n: Record<keyof JourneyNavigation, true> = { id: true, tenantId: true, journeyId: true, routeIndex: true, osrmVersion: true, instructionsLegacy: true, viaPointsLegacy: true, legs: true, snappedWaypoints: true, createdAt: true };
    expect(actual(metrics.response.body)).toEqual(keys<JourneyMetrics>(m));
    expect(actual((navigations.response.body as unknown[])[0])).toEqual(keys<JourneyNavigation>(n));
  });

  it('AssignedService y User', () => {
    const a: Record<keyof AssignedService, true> = { id: true, vehicle: true, route: true, driver: true, state: true, executionDate: true };
    const u: Record<keyof User, true> = { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, tenantId: true, createdAt: true, active: true, identifierType: true, identifierValue: true, avatar: true, lastLoginAt: true, updatedAt: true };
    expect(actual((assigned.response.body as unknown[])[0])).toEqual(keys<AssignedService>(a));
    expect(actual(firstOf(users))).toEqual(keys<User>(u));
  });

  it('la respuesta de login (SessionResponse y UserProfile)', () => {
    const session: Record<keyof SessionResponse, true> = { message: true, accessToken: true, refreshToken: true, expiresIn: true, user: true };
    const profile: Record<keyof UserProfile, true> = { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, tenantId: true, emailVerified: true, phoneVerified: true, createdAt: true };
    const body = login.response.body as unknown as { user: unknown };
    expect(actual(body)).toEqual(keys<SessionResponse>(session));
    expect(actual(body.user)).toEqual(keys<UserProfile>(profile));
  });
});
