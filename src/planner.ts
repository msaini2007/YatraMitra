import type { Destination } from './data'

export const PLANNER_PREFERENCES = [
  'Historical places',
  'Forts and palaces',
  'Lakes and nature',
  'Religious places',
  'Local food',
  'Shopping',
  'Adventure',
  'Cultural experiences',
] as const

export const TRAVEL_TYPES = ['Family', 'Solo', 'Friends', 'Couple'] as const
export const TRAVEL_PACES = ['Relaxed', 'Balanced', 'Fast-paced'] as const
export const TRANSPORT_MODES = ['Bus', 'Train', 'Private car', 'Taxi'] as const
export const ACCOMMODATION_PREFERENCES = ['Budget', 'Comfort', 'Premium'] as const

export type TravelType = typeof TRAVEL_TYPES[number]
export type TravelPace = typeof TRAVEL_PACES[number]
export type TransportMode = typeof TRANSPORT_MODES[number]
export type AccommodationPreference = typeof ACCOMMODATION_PREFERENCES[number]

export type PlannerForm = {
  origin: string
  cities: string[]
  startDate: string
  endDate: string
  travelers: number
  budget: number
  preferences: string[]
  travelType: TravelType
  pace: TravelPace
  transport: TransportMode
  accommodation: AccommodationPreference
}

export type PlannedVisit = Pick<
  Destination,
  | 'id' | 'name' | 'city' | 'category' | 'description' | 'image' | 'rating' | 'ticket'
  | 'hours' | 'closed' | 'duration' | 'lat' | 'lng' | 'coordinates' | 'history' | 'architecture' | 'culture'
> & {
  arrival: string
  departure: string
  visitMinutes: number
  travelMinutes: number | null
  travelDistanceKm: number | null
}

export type ItineraryDay = {
  dayNumber: number
  date: string
  city: string
  visits: PlannedVisit[]
  note?: string
}

export type RoadRoute = {
  distanceKm: number
  durationMinutes: number
  geometry: [number, number][]
  legs: { distanceKm: number; durationMinutes: number }[]
  originIncluded: boolean
  origin: { name: string; lat: number; lng: number } | null
}

export type BudgetBreakdown = {
  intercityTransportation: number
  localTransportation: number
  accommodation: number
  breakfast: number
  lunch: number
  dinner: number
  entryTickets: number
  shopping: number
  other: number
  total: number
  perPerson: number
  perDay: number
  budget: number
  remaining: number
  overBudget: boolean
  suggestions: string[]
}

export type PlannerTrip = {
  id: string
  title: string
  userId: string | null
  form: PlannerForm
  days: ItineraryDay[]
  route: RoadRoute | null
  routeMessage: string
  createdAt: string
  estimatedExpenses: BudgetBreakdown
}

const cityCenters: Record<string, { lat: number; lng: number }> = {
  Jaipur: { lat: 26.9124, lng: 75.7873 },
  Ajmer: { lat: 26.4499, lng: 74.6399 },
  Udaipur: { lat: 24.5854, lng: 73.7125 },
  Jodhpur: { lat: 26.2389, lng: 73.0243 },
  Jaisalmer: { lat: 26.9157, lng: 70.9083 },
  Pushkar: { lat: 26.4897, lng: 74.5511 },
  Bikaner: { lat: 28.0229, lng: 73.3119 },
  Chittorgarh: { lat: 24.8887, lng: 74.6269 },
  'Mount Abu': { lat: 24.5926, lng: 72.7156 },
  Delhi: { lat: 28.6139, lng: 77.209 },
}

export function getPlannerCities(destinations: Destination[]) {
  return [...new Set(destinations.map((destination) => destination.city))].sort((a, b) => a.localeCompare(b))
}

export function getTripDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0
  const start = new Date(`${startDate}T00:00:00Z`)
  const end = new Date(`${endDate}T00:00:00Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
}

export function validatePlannerForm(form: PlannerForm, maxCities: number) {
  if (!form.origin.trim()) return 'Enter a starting location.'
  if (!form.cities.length) return 'Select at least one Rajasthan destination.'
  if (!form.startDate || !form.endDate) return 'Choose both travel dates.'
  if (form.endDate < form.startDate) return 'The end date must be on or after the start date.'
  if (getTripDays(form.startDate, form.endDate) > 30) return 'Trips can be planned for up to 30 days at a time.'
  if (form.cities.length > maxCities) return 'Choose fewer destinations or add more travel days.'
  if (!Number.isInteger(form.travelers) || form.travelers < 1 || form.travelers > 20) return 'Enter a traveller count between 1 and 20.'
  if (!Number.isFinite(form.budget) || form.budget < 0) return 'Enter a valid budget in INR.'
  return ''
}

export function getVisitCapacity(form: PlannerForm) {
  const paceCapacity = form.pace === 'Relaxed' ? 2 : form.pace === 'Fast-paced' ? 4 : 3
  return Math.max(1, paceCapacity - (form.travelType === 'Family' ? 1 : 0))
}

function categoryMatchesPreference(destination: Destination, preference: string) {
  const category = destination.category.toLowerCase()
  if (preference === 'Historical places') return category.includes('historical')
  if (preference === 'Forts and palaces') return category.includes('fort') || category.includes('palace')
  if (preference === 'Lakes and nature') return category.includes('lake') || category.includes('nature')
  if (preference === 'Religious places') return category.includes('religious')
  if (preference === 'Adventure') return destination.id === 'sam-sand-dunes' || category.includes('nature')
  if (preference === 'Cultural experiences') {
    return category.includes('historical') || category.includes('fort') || category.includes('religious')
  }
  return false
}

function preferenceScore(destination: Destination, form: PlannerForm) {
  const matches = form.preferences.filter((preference) => categoryMatchesPreference(destination, preference)).length
  const budgetPerPersonPerDay = form.budget / Math.max(1, form.travelers * getTripDays(form.startDate, form.endDate))
  const budgetPreference = budgetPerPersonPerDay < 1500 ? (destination.ticket === 0 ? 0.5 : -0.5) : 0
  return matches + budgetPreference
}

function distanceBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const radians = (value: number) => value * Math.PI / 180
  const latDelta = radians(b.lat - a.lat)
  const lngDelta = radians(b.lng - a.lng)
  const value = Math.sin(latDelta / 2) ** 2
    + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(lngDelta / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

function orderCities(cities: string[], origin: string) {
  const remaining = [...cities]
  const start = getKnownCityPoint(origin)
  if (!start) return remaining
  const ordered: string[] = []
  let point = start
  while (remaining.length) {
    let nearestIndex = 0
    for (let index = 1; index < remaining.length; index += 1) {
      const current = cityCenters[remaining[index]]
      const nearest = cityCenters[remaining[nearestIndex]]
      if (current && nearest && distanceBetween(point, current) < distanceBetween(point, nearest)) nearestIndex = index
    }
    const [city] = remaining.splice(nearestIndex, 1)
    if (!city) break
    ordered.push(city)
    point = cityCenters[city] ?? point
  }
  return ordered
}

function orderWithinCity(destinations: Destination[], city: string, form: PlannerForm) {
  const remaining = destinations.filter((destination) => destination.city === city)
  const ordered: Destination[] = []
  let point = cityCenters[city]
  while (remaining.length) {
    let nearestIndex = 0
    for (let index = 1; index < remaining.length; index += 1) {
      const current = remaining[index]
      const nearest = remaining[nearestIndex]
      if (!current || !nearest) continue
      const currentDistance = point ? distanceBetween(point, current) : 0
      const nearestDistance = point ? distanceBetween(point, nearest) : 0
      const currentCost = currentDistance - preferenceScore(current, form) * 0.25
      const nearestCost = nearestDistance - preferenceScore(nearest, form) * 0.25
      if (currentCost < nearestCost || (currentCost === nearestCost && current.id.localeCompare(nearest.id) < 0)) {
        nearestIndex = index
      }
    }
    const [destination] = remaining.splice(nearestIndex, 1)
    if (!destination) break
    ordered.push(destination)
    point = destination
  }
  return ordered
}

export function selectPlannerDestinations(
  form: PlannerForm,
  allDestinations: Destination[],
  hotelData: { city: string; price: number }[] = [],
) {
  const tripDays = getTripDays(form.startDate, form.endDate)
  const maxStops = Math.min(60, tripDays * getVisitCapacity(form))
  const hasAttractionPreference = form.preferences.some((preference) =>
    !['Local food', 'Shopping'].includes(preference),
  )
  const cities = orderCities(form.cities, form.origin)
  const grouped = cities.map((city) => {
    let cityDestinations = allDestinations.filter((destination) => destination.city === city)
    if (hasAttractionPreference) {
      const matching = cityDestinations.filter((destination) =>
        form.preferences.some((preference) => categoryMatchesPreference(destination, preference)),
      )
      if (matching.length) cityDestinations = matching
    }
    cityDestinations.sort((a, b) =>
      preferenceScore(b, form) - preferenceScore(a, form) || b.rating - a.rating,
    )
    return orderWithinCity(cityDestinations, city, form)
  })

  const nights = Math.max(0, tripDays - 1)
  const rooms = Math.ceil(form.travelers / 2)
  const estimatedAccommodation = Array.from({ length: nights }, (_, index) => {
    const city = cities[index] ?? cities[0]
    return city ? getAccommodationRate(city, form.accommodation, hotelData) * rooms : 0
  }).reduce((total, cost) => total + cost, 0)
  const cityHops = Math.max(0, cities.length - 1)
  const estimatedTransportation = form.transport === 'Bus'
    ? form.travelers * (cityHops * 650 + tripDays * 220)
    : form.transport === 'Train'
      ? form.travelers * (cityHops * 950 + tripDays * 220)
      : tripDays * (form.transport === 'Taxi' ? 2250 : 1700)
  const foodPerPersonPerDay = form.travelType === 'Family' ? 500 : form.travelType === 'Solo' ? 650 : 600
  const estimatedFood = tripDays * form.travelers * foodPerPersonPerDay
  const estimatedShopping = form.preferences.includes('Shopping') ? form.travelers * tripDays * 350 : 0
  const estimatedOther = form.travelers * tripDays * 250
  let remainingEntryBudget = Math.max(
    0,
    form.budget - estimatedAccommodation - estimatedTransportation - estimatedFood - estimatedShopping - estimatedOther,
  )
  const selected: Destination[] = []
  for (const cityDestinations of grouped) {
    if (selected.length >= maxStops) break
    const affordable = cityDestinations.find(
      (candidate) => candidate.ticket * form.travelers <= remainingEntryBudget,
    )
    const fallback = [...cityDestinations].sort((a, b) =>
      a.ticket - b.ticket || preferenceScore(b, form) - preferenceScore(a, form) || a.id.localeCompare(b.id),
    )[0]
    const cityChoice = affordable ?? fallback
    if (!cityChoice) continue
    selected.push(cityChoice)
    remainingEntryBudget = Math.max(0, remainingEntryBudget - cityChoice.ticket * form.travelers)
  }
  const selectedIds = new Set(selected.map((destination) => destination.id))
  const remainingCandidates = grouped.flatMap((cityDestinations) => cityDestinations)
    .filter((destination) => !selectedIds.has(destination.id))
  for (const candidate of remainingCandidates) {
    if (selected.length >= maxStops) break
    const ticketCost = candidate.ticket * form.travelers
    if (ticketCost > remainingEntryBudget) continue
    selected.push(candidate)
    remainingEntryBudget -= ticketCost
  }
  return selected
}

function minutesFromClock(hour: number, minute: number, meridiem: string) {
  const normalizedHour = hour % 12 + (meridiem.toUpperCase() === 'PM' ? 12 : 0)
  return normalizedHour * 60 + minute
}

function openingWindow(hours: string) {
  const values = [...hours.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/gi)]
    .map((match) => minutesFromClock(Number(match[1]), Number(match[2] ?? 0), match[3] ?? 'AM'))
  if (values.length >= 2) return { opens: values[0], closes: values[1] }
  if (values.length === 1) return { opens: 6 * 60, closes: values[0] }
  if (/24\s*hours/i.test(hours)) return { opens: 0, closes: 24 * 60 }
  return { opens: 9 * 60, closes: null }
}

export function getVisitDuration(destination: Destination, pace: TravelPace, travelType: TravelType) {
  const matches = destination.duration.match(/(\d+)(?:\s*-\s*(\d+))?\s*hours?/i)
  const low = Number(matches?.[1] ?? 2)
  const high = Number(matches?.[2] ?? matches?.[1] ?? 2)
  const selected = pace === 'Relaxed' ? high : pace === 'Fast-paced' ? low : (low + high) / 2
  return Math.round(selected * 60 + (travelType === 'Family' ? 15 : 0))
}

function toClock(minutes: number) {
  const normalized = Math.max(0, Math.round(minutes)) % (24 * 60)
  const hour = Math.floor(normalized / 60)
  return `${String(hour).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`
}

function toLocalDate(date: string, dayOffset: number) {
  const result = new Date(`${date}T00:00:00`)
  result.setDate(result.getDate() + dayOffset)
  const year = result.getFullYear()
  const month = String(result.getMonth() + 1).padStart(2, '0')
  const day = String(result.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function allocateDays(
  candidates: Destination[],
  tripDays: number,
) {
  const cityCounts = new Map<string, number>()
  for (const destination of candidates) cityCounts.set(destination.city, (cityCounts.get(destination.city) ?? 0) + 1)
  const cities = [...cityCounts.keys()]
  const allocated = new Map(cities.map((city) => [city, 1]))
  let remaining = Math.max(0, Math.min(tripDays, candidates.length) - cities.length)
  while (remaining > 0) {
    const city = cities
      .filter((name) => (cityCounts.get(name) ?? 0) > (allocated.get(name) ?? 0))
      .sort((a, b) =>
        (cityCounts.get(b) ?? 0) / ((allocated.get(b) ?? 0) + 1)
        - (cityCounts.get(a) ?? 0) / ((allocated.get(a) ?? 0) + 1),
      )[0]
    if (!city) break
    allocated.set(city, (allocated.get(city) ?? 0) + 1)
    remaining -= 1
  }

  const dayCities = cities.flatMap((city) => Array.from({ length: allocated.get(city) ?? 0 }, () => city))
  while (dayCities.length < tripDays) {
    const city = cities.slice().sort((a, b) => (cityCounts.get(b) ?? 0) - (cityCounts.get(a) ?? 0))[0]
    if (!city) break
    dayCities.push(city)
  }
  return dayCities
}

export function buildItineraryDays(
  form: PlannerForm,
  candidates: Destination[],
  route: RoadRoute | null,
) {
  const tripDays = getTripDays(form.startDate, form.endDate)
  const capacity = getVisitCapacity(form)
  const cityDays = allocateDays(candidates, tripDays)
  const cityOffsets = new Map<string, number>()
  const candidateIndexes = new Map(candidates.map((destination, index) => [destination.id, index]))
  const cityDayCounts = new Map<string, number>()
  for (const city of cityDays) cityDayCounts.set(city, (cityDayCounts.get(city) ?? 0) + 1)
  const cityDayOffsets = new Map<string, number>()

  return cityDays.map((city, dayIndex) => {
    const cityVisits = candidates.filter((destination) => destination.city === city)
    const offset = cityOffsets.get(city) ?? 0
    const cityDayOffset = cityDayOffsets.get(city) ?? 0
    const cityDayCount = cityDayCounts.get(city) ?? 1
    const basePerDay = Math.floor(cityVisits.length / cityDayCount)
    const remainder = cityVisits.length % cityDayCount
    const desiredStops = basePerDay + (cityDayOffset < remainder ? 1 : 0)
    const selected = cityVisits.slice(offset, offset + Math.min(capacity, desiredStops))
    cityOffsets.set(city, offset + selected.length)
    cityDayOffsets.set(city, cityDayOffset + 1)
    const previousCity = cityDays[dayIndex - 1]
    const isCityTransfer = dayIndex > 0 && previousCity !== city
    const firstDestination = selected[0]
    const firstRouteIndex = firstDestination ? candidateIndexes.get(firstDestination.id) ?? -1 : -1
    const firstLegIndex = firstRouteIndex - (route?.originIncluded ? 0 : 1)
    const firstLeg = route && firstLegIndex >= 0 ? route.legs[firstLegIndex] : undefined
    let clock = dayIndex === 0 && route?.originIncluded
      ? 7 * 60 + (route.legs[0]?.durationMinutes ?? 0)
      : isCityTransfer && firstLeg
        ? 7 * 60
        : isCityTransfer
          ? 13 * 60
          : 9 * 60
    const visits: PlannedVisit[] = []
    let scheduleTruncated = false
    let usedUnroutedLocalBuffer = false

    for (const destination of selected) {
      const routeIndex = candidateIndexes.get(destination.id) ?? -1
      const sameDayPrevious = visits.length > 0
      const travelLegIndex = routeIndex - (route?.originIncluded ? 0 : 1)
      const isFirstCityStop = visits.length === 0 && isCityTransfer
      const isOriginTransfer = visits.length === 0 && dayIndex === 0 && Boolean(route?.originIncluded)
      const travelLeg = (sameDayPrevious || isFirstCityStop || isOriginTransfer) && route && travelLegIndex >= 0
        ? route.legs[travelLegIndex]
        : undefined
      const travelMinutes = travelLeg?.durationMinutes ?? null
      if (travelMinutes !== null && !isOriginTransfer) clock += travelMinutes
      else if (sameDayPrevious && !route) {
        clock += 45
        usedUnroutedLocalBuffer = true
      }
      const window = openingWindow(destination.hours)
      const arrival = Math.max(clock, window.opens)
      const visitMinutes = getVisitDuration(destination, form.pace, form.travelType)
      const departure = arrival + visitMinutes
      if (departure > 21 * 60 || (window.closes !== null && departure > window.closes)) {
        scheduleTruncated = true
        break
      }
      visits.push({
        ...destination,
        arrival: toClock(arrival),
        departure: toClock(departure),
        visitMinutes,
        travelMinutes,
        travelDistanceKm: travelLeg?.distanceKm ?? null,
      })
      clock = departure + 30
    }

    const notes = []
    if (visits.length === 0) {
      notes.push('No attraction is scheduled for this day. Keep it open for travel, meals or rest, or add a stop from this city.')
    }
    if (isCityTransfer && !route) {
      notes.push('Intercity connection time is unavailable; visits start after a planning buffer at 1:00 PM. Confirm transport and arrival time.')
    }
    if (usedUnroutedLocalBuffer) {
      notes.push('A 45-minute local transfer buffer is used between stops because reliable route times are unavailable; it is not live travel guidance.')
    }
    if (scheduleTruncated) {
      notes.push('Remaining stops were left unscheduled to avoid exceeding listed hours or a practical day length.')
    }
    return {
      dayNumber: dayIndex + 1,
      date: toLocalDate(form.startDate, dayIndex),
      city,
      visits,
      ...(notes.length ? { note: notes.join(' ') } : {}),
    }
  })
}

export function getKnownCityPoint(city: string) {
  const name = Object.keys(cityCenters).find((candidate) => candidate.toLowerCase() === city.trim().toLowerCase())
  return name ? cityCenters[name] : null
}

function getAccommodationRate(
  city: string,
  preference: AccommodationPreference,
  hotelData: { city: string; price: number }[],
) {
  const rates = hotelData
    .filter((hotel) => hotel.city === city)
    .map((hotel) => hotel.price)
    .sort((a, b) => a - b)
  const rateIndex = preference === 'Budget'
    ? 0
    : preference === 'Premium'
      ? rates.length - 1
      : Math.floor((rates.length - 1) / 2)
  return rates[rateIndex] ?? (
    preference === 'Budget' ? 1800 : preference === 'Premium' ? 6500 : 3500
  )
}

export function rescheduleExistingDays(
  days: ItineraryDay[],
  route: RoadRoute | null,
) {
  const routeIndexes = new Map(
    days.flatMap((day) => day.visits).map((visit, index) => [visit.id, index]),
  )
  return days.map((day, dayIndex) => {
    const previousDay = days[dayIndex - 1]
    const isCityTransfer = Boolean(dayIndex > 0 && previousDay && previousDay.city !== day.city)
    const firstVisit = day.visits[0]
    const firstRouteIndex = firstVisit ? routeIndexes.get(firstVisit.id) ?? -1 : -1
    const firstLegIndex = firstRouteIndex - (route?.originIncluded ? 0 : 1)
    const firstLeg = route && firstLegIndex >= 0 ? route.legs[firstLegIndex] : undefined
    let clock = dayIndex === 0 && route?.originIncluded
      ? 7 * 60 + (route.legs[0]?.durationMinutes ?? 0)
      : isCityTransfer && firstLeg
        ? 7 * 60
        : isCityTransfer
          ? 13 * 60
          : 9 * 60
    let usedUnroutedLocalBuffer = false
    const visits = day.visits.map((visit, visitIndex) => {
      const routeIndex = routeIndexes.get(visit.id) ?? -1
      const legIndex = routeIndex - (route?.originIncluded ? 0 : 1)
      const isFirstCityStop = visitIndex === 0 && isCityTransfer
      const isOriginTransfer = visitIndex === 0 && dayIndex === 0 && Boolean(route?.originIncluded)
      const travelLeg = (visitIndex > 0 || isFirstCityStop || isOriginTransfer) && route && legIndex >= 0
        ? route.legs[legIndex]
        : undefined
      const travelMinutes = travelLeg?.durationMinutes ?? null
      if (travelMinutes !== null && !isOriginTransfer) clock += travelMinutes
      else if (visitIndex > 0 && !route) {
        clock += 45
        usedUnroutedLocalBuffer = true
      }
      const window = openingWindow(visit.hours)
      const arrival = Math.max(clock, window.opens)
      const departure = arrival + visit.visitMinutes
      clock = departure + 30
      return {
        ...visit,
        arrival: toClock(arrival),
        departure: toClock(departure),
        travelMinutes,
        travelDistanceKm: travelLeg?.distanceKm ?? null,
      }
    })
    const hoursMayNotFit = visits.some((visit) => {
      const window = openingWindow(visit.hours)
      const [hour, minute] = visit.departure.split(':').map(Number)
      return window.closes !== null && hour * 60 + minute > window.closes
    })
    const notes = [
      ...(day.visits.length === 0 ? ['Keep this day flexible for travel, meals or rest.'] : []),
      ...(isCityTransfer && !route ? ['Intercity connection time is unavailable; visits start after a planning buffer at 1:00 PM. Confirm transport and arrival time.'] : []),
      ...(usedUnroutedLocalBuffer ? ['A 45-minute local transfer buffer is used between stops because reliable route times are unavailable; it is not live travel guidance.'] : []),
      ...(hoursMayNotFit ? ['An edited stop may run past its listed closing time; verify venue hours and adjust the schedule.'] : []),
    ]
    return {
      ...day,
      visits,
      note: notes.length ? [...new Set(notes)].join(' ') : undefined,
    }
  })
}

export async function fetchDrivingRoute(origin: string, stops: Destination[]): Promise<RoadRoute | null> {
  const originPoint = getKnownCityPoint(origin)
  const firstStop = stops[0]
  const originIncluded = Boolean(
    originPoint && firstStop && distanceBetween(originPoint, firstStop) > 0.5,
  )
  const points = [
    ...(originIncluded && originPoint ? [{ lat: originPoint.lat, lng: originPoint.lng }] : []),
    ...stops.map(({ lat, lng }) => ({ lat, lng })),
  ]
  if (points.length < 2) return null

  const path = points.map(({ lat, lng }) => `${lng},${lat}`).join(';')
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 12000)
  let response: Response
  try {
    response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&steps=false&geometries=geojson`,
      { signal: controller.signal },
    )
  } finally {
    window.clearTimeout(timeout)
  }
  if (!response.ok) throw new Error(`Routing service returned HTTP ${response.status}.`)
  const result = await response.json() as {
    code?: string
    routes?: Array<{
      distance?: number
      duration?: number
      geometry?: { coordinates?: number[][] }
      legs?: Array<{ distance?: number; duration?: number }>
    }>
  }
  const route = result.routes?.[0]
  if (result.code !== 'Ok' || !route || !route.geometry?.coordinates?.length) {
    throw new Error('The routing service did not return a usable driving route.')
  }
  const originName = originPoint ? `${origin.trim()} city centre (approximate)` : null
  return {
    distanceKm: (route.distance ?? 0) / 1000,
    durationMinutes: (route.duration ?? 0) / 60,
    geometry: route.geometry.coordinates
      .filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]))
        .map((point) => [point[1], point[0]] as [number, number]),
    legs: (route.legs ?? []).map((leg) => ({
      distanceKm: (leg.distance ?? 0) / 1000,
      durationMinutes: (leg.duration ?? 0) / 60,
    })),
    originIncluded,
    origin: originIncluded && originPoint && originName
      ? { name: originName, lat: originPoint.lat, lng: originPoint.lng }
      : null,
  }
}

export function createBudget(
  form: PlannerForm,
  days: ItineraryDay[],
  route: RoadRoute | null,
  hotelData: { city: string; price: number }[],
): BudgetBreakdown {
  const tripDays = getTripDays(form.startDate, form.endDate)
  const nights = Math.max(0, tripDays - 1)
  const rooms = Math.ceil(form.travelers / 2)
  const nightCities = days.slice(0, nights).map((day) => day.city)
  const accommodation = nightCities.reduce((total, city) => {
    return total + getAccommodationRate(city, form.accommodation, hotelData) * rooms
  }, 0)
  const cityCount = new Set(days.map((day) => day.city)).size
  const cityHops = Math.max(0, cityCount - 1)
  let intercityTransportation: number
  let localTransportation: number
  if (form.transport === 'Bus') {
    intercityTransportation = form.travelers * cityHops * 650
    localTransportation = tripDays * form.travelers * 220
  } else if (form.transport === 'Train') {
    intercityTransportation = form.travelers * cityHops * 950
    localTransportation = tripDays * form.travelers * 220
  } else if (route) {
    const perKm = form.transport === 'Taxi' ? 19 : 14
    const visits = days.flatMap((day) => day.visits)
    let intercityDistance = 0
    let localRouteDistance = 0
    visits.forEach((visit, index) => {
      const legIndex = index - (route.originIncluded ? 0 : 1)
      const leg = legIndex >= 0 ? route.legs[legIndex] : undefined
      if (!leg) return
      const previousCity = index === 0
        ? getKnownCityPoint(form.origin) ? form.origin : null
        : visits[index - 1]?.city ?? null
      if (previousCity && previousCity.toLowerCase() !== visit.city.toLowerCase()) {
        intercityDistance += leg.distanceKm
      } else {
        localRouteDistance += leg.distanceKm
      }
    })
    intercityTransportation = Math.ceil(intercityDistance * perKm)
    localTransportation = Math.ceil(localRouteDistance * perKm)
  } else {
    intercityTransportation = cityHops * (form.transport === 'Taxi' ? 2250 : 1400)
    localTransportation = tripDays * (form.transport === 'Taxi' ? 450 : 300)
  }
  const foodPerPersonPerDay = form.travelType === 'Family' ? 500 : form.travelType === 'Solo' ? 650 : 600
  const breakfast = Math.round(tripDays * form.travelers * foodPerPersonPerDay * 0.25)
  const lunch = Math.round(tripDays * form.travelers * foodPerPersonPerDay * 0.35)
  const dinner = tripDays * form.travelers * foodPerPersonPerDay - breakfast - lunch
  const entryTickets = days.reduce(
    (total, day) => total + day.visits.reduce((subtotal, visit) => subtotal + visit.ticket * form.travelers, 0),
    0,
  )
  const shopping = form.preferences.includes('Shopping') ? form.travelers * tripDays * 350 : 0
  const other = form.travelers * tripDays * 250
  const total = intercityTransportation + localTransportation + accommodation + breakfast + lunch + dinner + entryTickets + shopping + other
  const suggestions: string[] = []
  if (total > form.budget) {
    if (form.transport === 'Taxi' || form.transport === 'Private car') {
      suggestions.push('Compare bus or train fares for intercity travel; the current transport figure is a planning estimate.')
    }
    if (accommodation > nights * rooms * 2200) {
      suggestions.push('Choose budget guesthouses or homestays and confirm current rates directly.')
    } else {
      suggestions.push('Compare lower-cost guesthouses in each city before booking.')
    }
    if (entryTickets > 0) suggestions.push('Prioritize free attractions and remove paid stops to reduce the entry-ticket estimate.')
    if (shopping > 0) suggestions.push('Set a shopping cap or keep shopping to one market stop.')
    if (!suggestions.length) suggestions.push('Shorten the trip or increase the budget; avoid relying on unconfirmed prices.')
  }
  return {
    intercityTransportation,
    localTransportation,
    accommodation,
    breakfast,
    lunch,
    dinner,
    entryTickets,
    shopping,
    other,
    total,
    perPerson: total / form.travelers,
    perDay: tripDays > 0 ? total / tripDays : total,
    budget: form.budget,
    remaining: form.budget - total,
    overBudget: total > form.budget,
    suggestions,
  }
}

export function formatINR(amount: number) {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`
}

export function formatDuration(minutes: number) {
  const roundedMinutes = Math.round(minutes)
  const hours = Math.floor(roundedMinutes / 60)
  const remainder = roundedMinutes % 60
  return hours ? `${hours} hr${remainder ? ` ${remainder} min` : ''}` : `${remainder} min`
}
