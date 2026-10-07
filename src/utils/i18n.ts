export type Language = 'de' | 'en';

export interface Translations {
  appName: string;
  appSubtitle: string;
  planner: string;
  map: string;
  lines: string;
  options: string;
  startStation: string;
  destinationStation: string;
  stopoverStation: string;
  addStopover: string;
  removeStopover: string;
  stopover: string;
  selectStart: string;
  selectDestination: string;
  selectStopover: string;
  swapStations: string;
  frequentlySearched: string;
  routesFound: string;
  viewOnMap: string;
  fastestRoute: string;
  fewestTransfers: string;
  prioritizeMetro: string;
  prioritizeIC: string;
  routePreference: string;
  accessibleRoute: string;
  directConnection: string;
  transfers: string;
  transferCount: string;
  min: string;
  stops: string;
  detailedPlan: string;
  totalDuration: string;
  shareRoute: string;
  saveRoute: string;
  savedRoute: string;
  routeSaved: string;
  direction: string;
  intermediateStops: string;
  changeAt: string;
  changeFrom: string;
  toLine: string;
  walkTime: string;
  destinationReached: string;
  stopoverReached: string;
  searchPlaceholder: string;
  noStationsFound: string;
  interchangeStation: string;
  regularStation: string;
  symbolExplanation: string;
  airport: string;
  icTrains: string;
  accessible: string;
  timTrainStation: string;
  icLayerToggle: string;
  icLayerOn: string;
  icLayerOff: string;
  transferRequired: string;
  resetView: string;
  startHere: string;
  setAsDestination: string;
  setAsStopover: string;
  allLines: string;
  normalService: string;
  terminals: string;
  stationsCount: string;
  allStations: string;
  airportsFilter: string;
  icFilter: string;
  accessibleFilter: string;
  disruptionsTitle: string;
  noDisruptions: string;
  allLinesOperational: string;
  constructionNotice: string;
  simulateDisruption: string;
  clearDisruptions: string;
  reportDisruption: string;
  reportDisruptionTitle: string;
  reportDisruptionSubtitle: string;
  disruptionType: string;
  missingTracks: string;
  missingTracksDesc: string;
  inactiveRedstone: string;
  inactiveRedstoneDesc: string;
  emptyMinecart: string;
  emptyMinecartDesc: string;
  construction: string;
  constructionDesc: string;
  closure: string;
  closureDesc: string;
  affectedLine: string;
  betweenStations: string;
  fromStation: string;
  toStation: string;
  optionalNotes: string;
  notesPlaceholder: string;
  reporterName: string;
  reporterPlaceholder: string;
  submitReport: string;
  confirmDisruption: string;
  confirmed: string;
  confirmationsCount: string;
  disruptionOnYourRoute: string;
  planAlternativeRoute: string;
  avoidDisruptions: string;
  avoidDisruptionsActive: string;
  alternativeRouteFound: string;
  alternativeRouteDesc: string;
  noAlternativePossible: string;
  resetBypass: string;
  reportSuccess: string;
  reportFailed: string;
  metroTab: string;
  icTab: string;
  settingsTitle: string;
  languageSetting: string;
  themeSetting: string;
  darkMode: string;
  lightMode: string;
  savedTripsTitle: string;
  noSavedTrips: string;
  loadTrip: string;
  deleteTrip: string;
  appVersion: string;
  installApp: string;
  installIos: string;
  offlineMode: string;
  close: string;
  recentRoutes: string;
  recentRoutesDesc: string;
  lastEntry: string;
  loadLastRoute: string;
  noRecentRoutes: string;
  clearRecents: string;
  planNewTrip: string;
  emptyPlannerPrompt: string;
  lastSearched: string;
  recentsCount: string;
  mapRoutePlanning: string;
  mapRoutePlanningDesc: string;
  mapStationInfoOnly: string;
  favorites: string;
  favoriteStations: string;
  noFavoritesYet: string;
  addToFavorites: string;
  removeFromFavorites: string;
  tripSummary: string;
  viewInTripPlanner: string;
  disruptionDetails: string;
  activeDisruptionOnMap: string;
  calculateRoute: string;
  reportDisruptionGone: string;
  disruptionGoneReported: string;
  metroLayerToggle: string;
  metroLayerOn: string;
  metroLayerOff: string;
  expandLegend: string;
  collapseLegend: string;
  hapticFeedback: string;
  hapticFeedbackDesc: string;
  ignoreDisruption: string;
  ignoreDisruptionTitle: string;
  ignoreDisruptionWarning: string;
  proceedAnyway: string;
  cancel: string;
  disruptionIgnoredBanner: string;
  reconsiderDisruption: string;
  disruptionOnThisLeg: string;
  onlineStatus: string;
  offlineStatus: string;
  offlineDisruptionWarning: string;
  recalculateRoute: string;
  clearRoute: string;
  home: string;
  welcomeGreeting: string;
  welcomeSubtitle: string;
  latestNews: string;
  publishArticle: string;
  newArticleTitle: string;
  articleTitle: string;
  articleSummary: string;
  articleContent: string;
  articleCategory: string;
  readMore: string;
  readTime: string;
  pinnedArticle: string;
  adminSection: string;
  adminCodeLabel: string;
  adminCodePlaceholder: string;
  verifyAdmin: string;
  adminActive: string;
  adminActiveDesc: string;
  exitAdmin: string;
  adminWrongCode: string;
  adminSuccessCode: string;
  deleteArticle: string;
  deleteArticleConfirm: string;
  editArticle: string;
  saveChanges: string;
  articleUpdated: string;
  quickPlanTrip: string;
  quickViewMap: string;
  networkStatus: string;
  allLinesOperating: string;
  disruptionsActiveNotice: string;
  tabBarStyleSetting: string;
  tabBarStyleDesc: string;
  tabBarStyleIOS26: string;
  tabBarStyleClassic: string;
  startupDisruptionOverview: string;
  startupDisruptionOverviewDesc: string;
  refreshDataButton: string;
  refreshDataDesc: string;
  refreshDataSuccess: string;
  refreshingData: string;
  syncServerSetting: string;
  syncServerDesc: string;
}

export const translations: Record<Language, Translations> = {
  de: {
    appName: 'MetroFlow',
    appSubtitle: 'ÄÄPIZRM U-Bahn & IC-Netz',
    planner: 'Routenplaner',
    map: 'Netzplan',
    lines: 'Linien & Info',
    options: 'Optionen',
    startStation: 'Startstation (Von)',
    destinationStation: 'Zielstation (Nach)',
    stopoverStation: 'Zwischenstopp (Über)',
    addStopover: 'Zwischenstopp hinzufügen',
    removeStopover: 'Zwischenstopp entfernen',
    stopover: 'Zwischenstopp',
    selectStart: 'Start auswählen...',
    selectDestination: 'Ziel auswählen...',
    selectStopover: 'Zwischenstopp auswählen...',
    swapStations: 'Start und Ziel tauschen',
    frequentlySearched: 'Häufig gesucht:',
    routesFound: 'Gefundene Verbindungen',
    viewOnMap: 'Auf Karte ansehen',
    fastestRoute: 'Schnellste Route',
    fewestTransfers: 'Wenigste Umstiege',
    prioritizeMetro: 'U-Bahn bevorzugen',
    prioritizeIC: 'IC-Züge bevorzugen',
    routePreference: 'Priorisierung:',
    accessibleRoute: 'Barrierefreie Route',
    directConnection: 'Direktverbindung',
    transfers: 'Umstiege',
    transferCount: 'x Umsteigen',
    min: 'Min.',
    stops: 'Stationen',
    detailedPlan: 'Detaillierter Reiseplan',
    totalDuration: 'Gesamtfahrzeit',
    shareRoute: 'Route teilen',
    saveRoute: 'Route speichern',
    savedRoute: 'Gespeichert',
    routeSaved: 'Route erfolgreich gespeichert',
    direction: 'Richtung',
    intermediateStops: 'Stationen',
    changeAt: 'Umsteigen an',
    changeFrom: 'Wechseln von',
    toLine: 'in',
    walkTime: 'Fußweg ca. 2–3 Min. zwischen den Bahnsteigen.',
    destinationReached: 'Ziel erreicht',
    stopoverReached: 'Zwischenstopp erreicht • Weiterfahrt',
    searchPlaceholder: 'Station oder Linie suchen...',
    noStationsFound: 'Keine Station gefunden',
    interchangeStation: 'Umsteigebahnhof / Hauptbahnhof',
    regularStation: 'Haltestelle',
    symbolExplanation: 'Symbol Erklärung',
    airport: 'Flughafen (Airport)',
    icTrains: 'Inter City Fernzüge',
    accessible: 'Barrierefreier Ausgang',
    timTrainStation: 'Tim Train Haltestelle',
    icLayerToggle: 'IC-Züge Ebene',
    icLayerOn: 'IC-Ebene: An',
    icLayerOff: 'IC-Ebene: Aus',
    transferRequired: 'Umsteigen notwendig (⚙️)',
    resetView: 'Ansicht zurücksetzen',
    startHere: 'Hier starten',
    setAsDestination: 'Als Ziel',
    setAsStopover: 'Als Zwischenstopp',
    allLines: 'Alle Linien',
    normalService: 'Normaler Betrieb',
    terminals: 'Endstationen:',
    stationsCount: 'Stationen',
    allStations: 'Alle Stationen im System',
    airportsFilter: 'Flughäfen',
    icFilter: 'IC-Bahnhöfe',
    accessibleFilter: 'Barrierefrei',
    disruptionsTitle: 'Aktuelle Betriebslage & Störungen',
    noDisruptions: 'Keine aktuellen Störungen gemeldet. Alle U-Bahn- und IC-Zuglinien verkehren planmäßig.',
    allLinesOperational: 'Regulärer Fahrbetrieb auf allen Linien',
    constructionNotice: 'Gleisbauarbeiten & Baustellen',
    simulateDisruption: 'Demo-Störung simulieren',
    clearDisruptions: 'Störungen zurücksetzen',
    reportDisruption: 'Störung melden',
    reportDisruptionTitle: 'Störung auf einer Linie melden',
    reportDisruptionSubtitle: 'Die Meldung wird live für alle Nutzer und Spieler dieser App geteilt.',
    disruptionType: 'Art der Störung',
    missingTracks: 'Fehlende Gleise',
    missingTracksDesc: 'Gleise wurden abgebaut, zerstört oder fehlen komplett',
    inactiveRedstone: 'Inaktive Redstone-Schienen',
    inactiveRedstoneDesc: 'Powered Rails ohne Signal; Minecart verliert Schwung',
    emptyMinecart: 'Leerer Minecart',
    emptyMinecartDesc: 'Herrenloser Minecart blockiert das Streckengleis',
    construction: 'Gleisbauarbeiten',
    constructionDesc: 'Wartung, Schienenumbau oder Streckenerneuerung',
    closure: 'Streckensperrung',
    closureDesc: 'Abschnitt vorübergehend vollständig gesperrt',
    affectedLine: 'Betroffene Linie',
    betweenStations: 'Abschnitt zwischen den Stationen',
    fromStation: 'Von Station',
    toStation: 'Bis Station',
    optionalNotes: 'Zusatzinformation / Notiz (optional)',
    notesPlaceholder: 'z. B. Minecart steht direkt vor der Kurve...',
    reporterName: 'Dein Spielername / Melder (optional)',
    reporterPlaceholder: 'z. B. Steve, Alex oder Lokführer',
    submitReport: 'Störung live melden',
    confirmDisruption: 'Bestätigen',
    confirmed: 'Bestätigt',
    confirmationsCount: 'Bestätigung(en)',
    disruptionOnYourRoute: 'Achtung: Störungsmeldung auf deiner Route!',
    planAlternativeRoute: 'Alternative Route ohne Störung berechnen',
    avoidDisruptions: 'Störungen umfahren',
    avoidDisruptionsActive: 'Umfahrung aktiv',
    alternativeRouteFound: 'Störungsfreie Alternativroute',
    alternativeRouteDesc: 'Umfährt den gemeldeten Störungsabschnitt',
    noAlternativePossible: 'Keine alternative Umfahrung möglich (einzige Schienenverbindung)',
    resetBypass: 'Originalroute anzeigen',
    reportSuccess: 'Störung erfolgreich für alle Nutzer gemeldet!',
    reportFailed: 'Fehler beim Melden der Störung. Bitte erneut versuchen.',
    metroTab: 'U-Bahn Linien',
    icTab: 'IC-Zuglinien',
    settingsTitle: 'Optionen & Einstellungen',
    languageSetting: 'Sprache / Language',
    themeSetting: 'Erscheinungsbild',
    darkMode: 'Dunkelmodus (Dark Mode)',
    lightMode: 'Hellmodus (Light Mode)',
    savedTripsTitle: 'Gespeicherte Fahrten',
    noSavedTrips: 'Noch keine gespeicherten Fahrten vorhanden. Plane eine Route und tippe auf das Lesezeichen-Symbol.',
    loadTrip: 'Route laden',
    deleteTrip: 'Löschen',
    appVersion: 'ÄÄPIZRM 044 Netzplan & IC-Züge • Stand 2026',
    installApp: 'App installieren',
    installIos: 'iOS Web App',
    offlineMode: 'Offline Modus — Lokaler Fahrplan aktiv',
    close: 'Schließen',
    recentRoutes: 'Kürzliche Routen',
    recentRoutesDesc: 'Schnellzugriff auf deine letzten 3 gesuchten Routen',
    lastEntry: 'Letzter Eintrag',
    loadLastRoute: 'Letzte Route laden',
    noRecentRoutes: 'Noch keine kürzlichen Routen vorhanden',
    clearRecents: 'Verlauf löschen',
    planNewTrip: 'Neue Fahrt planen',
    emptyPlannerPrompt: 'Wähle Start- und Zielstation aus, um Verbindungen zu berechnen.',
    lastSearched: 'Zuletzt geplant',
    recentsCount: 'Letzte 3 Routen',
    mapRoutePlanning: 'Routenplanung von der Karte',
    mapRoutePlanningDesc: 'Erlaube das Auswählen von Start-, Zwischenstopp- und Zielstationen direkt durch Antippen auf der Karte.',
    mapStationInfoOnly: 'Reiner Informationsmodus (Planung deaktiviert)',
    favorites: 'Favoriten',
    favoriteStations: 'Favorisierte Stationen',
    noFavoritesYet: 'Noch keine Favoriten gespeichert. Tippe auf den Stern ⭐ bei einer Station, um sie hier abzulegen.',
    addToFavorites: 'Zu Favoriten hinzufügen',
    removeFromFavorites: 'Aus Favoriten entfernen',
    tripSummary: 'Aktive Route auf der Karte',
    viewInTripPlanner: 'Im Routenplaner öffnen',
    disruptionDetails: 'Störungsmeldung',
    activeDisruptionOnMap: 'Gleisstörung auf der Strecke',
    calculateRoute: 'Verbindung suchen',
    reportDisruptionGone: 'Störung behoben',
    disruptionGoneReported: 'Als behoben gemeldet',
    metroLayerToggle: 'U-Bahn Netz Ebene',
    metroLayerOn: 'U-Bahn: An',
    metroLayerOff: 'U-Bahn: Aus',
    expandLegend: 'Linien einblenden',
    collapseLegend: 'Linien ausblenden',
    hapticFeedback: 'Haptisches Feedback',
    hapticFeedbackDesc: 'Spürbare Vibrationen bei Interaktionen und Routenberechnungen (iOS-Stil).',
    ignoreDisruption: 'Störung ignorieren',
    ignoreDisruptionTitle: 'Störung wirklich ignorieren?',
    ignoreDisruptionWarning: 'Warnung: Möchtest du diese Streckenstörung wirklich ignorieren und die ursprüngliche Verbindung planen? Es kann zu Zugausfällen, Verzögerungen oder gesperrten Streckengleisen kommen. In deiner Schritt-für-Schritt-Wegbeschreibung bleibt der Störungshinweis weiterhin sichtbar.',
    proceedAnyway: 'Trotzdem fortfahren',
    cancel: 'Abbrechen',
    disruptionIgnoredBanner: 'Störung wird ignoriert – ursprüngliche Route aktiv.',
    reconsiderDisruption: 'Störung wieder beachten',
    disruptionOnThisLeg: 'Gemeldete Störung auf diesem Abschnitt:',
    onlineStatus: 'Online',
    offlineStatus: 'Offline',
    offlineDisruptionWarning: 'Offline-Modus aktiv: Du bist offline. Der Fahrplan und die Routenberechnung funktionieren offline, aber gemeldete Streckenstörungen sind eventuell nicht aktuell.',
    recalculateRoute: 'Route neu berechnen',
    clearRoute: 'Route leeren',
    home: 'Start',
    welcomeGreeting: 'Willkommen in ÄÄPIZRM',
    welcomeSubtitle: 'Dein modernes Informations- und Navigationsportal für das U-Bahn- & IC-Netz.',
    latestNews: 'Aktuelle Netz-News & Artikel',
    publishArticle: 'Artikel veröffentlichen',
    newArticleTitle: 'Neuen Artikel verfassen',
    articleTitle: 'Titel des Artikels',
    articleSummary: 'Kurzbeschreibung (Vorschau)',
    articleContent: 'Artikelinhalt (Text)',
    articleCategory: 'Kategorie',
    readMore: 'Weiterlesen',
    readTime: 'Min. Lesezeit',
    pinnedArticle: 'Angeheftet',
    adminSection: 'Admin-Bereich',
    adminCodeLabel: 'Admin-Freischaltcode',
    adminCodePlaceholder: 'Admin-Code eingeben...',
    verifyAdmin: 'Freischalten',
    adminActive: 'Admin-Modus aktiv',
    adminActiveDesc: 'Du bist als Administrator autorisiert und kannst offizielle Artikel und Mitteilungen veröffentlichen.',
    exitAdmin: 'Admin-Modus beenden',
    adminWrongCode: 'Ungültiger Admin-Code. Bitte überprüfe deine Eingabe.',
    adminSuccessCode: 'Admin-Modus erfolgreich aktiviert!',
    deleteArticle: 'Artikel löschen',
    deleteArticleConfirm: 'Möchtest du diesen Artikel wirklich unwiderruflich entfernen?',
    editArticle: 'Artikel bearbeiten',
    saveChanges: 'Änderungen speichern',
    articleUpdated: 'Artikel erfolgreich aktualisiert!',
    quickPlanTrip: 'Route planen',
    quickViewMap: 'Netzkarte',
    networkStatus: 'Betriebslage',
    allLinesOperating: 'Alle U-Bahn- & IC-Linien verkehren planmäßig',
    disruptionsActiveNotice: 'Streckenstörung(en) im Schienennetz gemeldet',
    tabBarStyleSetting: 'Menüleisten-Design',
    tabBarStyleDesc: 'Wähle zwischen dem schwebenden iOS 26 Glas-Dock und der klassischen Leiste.',
    tabBarStyleIOS26: 'iOS 26 Glas-Dock',
    tabBarStyleClassic: 'Klassische Leiste',
    startupDisruptionOverview: 'Störungsübersicht beim App-Start',
    startupDisruptionOverviewDesc: 'Zeigt beim Starten der App automatisch ein kompaktes Lagebild aller aktuellen Störungen an.',
    refreshDataButton: 'Daten jetzt aktualisieren',
    refreshDataDesc: 'Prüfe online nach neuen Störungsmeldungen und veröffentlichten Artikeln.',
    refreshDataSuccess: 'Daten erfolgreich online aktualisiert!',
    refreshingData: 'Aktualisiere...',
    syncServerSetting: 'Online-Synchronisation',
    syncServerDesc: 'Synchronisiert Störungen und Artikel in Echtzeit geräteübergreifend.',
  },
  en: {
    appName: 'MetroFlow',
    appSubtitle: 'ÄÄPIZRM Metro & IC Rail',
    planner: 'Trip Planner',
    map: 'Transit Map',
    lines: 'Lines & Info',
    options: 'Options',
    startStation: 'Origin (From)',
    destinationStation: 'Destination (To)',
    stopoverStation: 'Stopover (Via)',
    addStopover: 'Add stopover',
    removeStopover: 'Remove stopover',
    stopover: 'Stopover',
    selectStart: 'Select start station...',
    selectDestination: 'Select destination...',
    selectStopover: 'Select stopover station...',
    swapStations: 'Swap start and destination',
    frequentlySearched: 'Popular Stations:',
    routesFound: 'Available Routes',
    viewOnMap: 'View on map',
    fastestRoute: 'Fastest Route',
    fewestTransfers: 'Fewest Transfers',
    prioritizeMetro: 'Prioritize Metro',
    prioritizeIC: 'Prioritize IC Trains',
    routePreference: 'Routing Priority:',
    accessibleRoute: 'Accessible Route',
    directConnection: 'Direct line',
    transfers: 'Transfers',
    transferCount: 'transfer(s)',
    min: 'min',
    stops: 'stops',
    detailedPlan: 'Step-by-step Itinerary',
    totalDuration: 'Total travel time',
    shareRoute: 'Share route',
    saveRoute: 'Save journey',
    savedRoute: 'Saved',
    routeSaved: 'Route saved successfully',
    direction: 'Towards',
    intermediateStops: 'stops',
    changeAt: 'Transfer at',
    changeFrom: 'Change from',
    toLine: 'to',
    walkTime: 'Transfer walk time approx. 2–3 min between platforms.',
    destinationReached: 'Arrived at destination',
    stopoverReached: 'Stopover reached • Continuing journey',
    searchPlaceholder: 'Search station or line...',
    noStationsFound: 'No stations found',
    interchangeStation: 'Interchange / Main Station',
    regularStation: 'Station',
    symbolExplanation: 'Legend / Symbols',
    airport: 'Airport',
    icTrains: 'InterCity Trains',
    accessible: 'Step-free / Accessible exit',
    timTrainStation: 'Tim Train Station',
    icLayerToggle: 'IC Trains Layer',
    icLayerOn: 'IC Layer: On',
    icLayerOff: 'IC Layer: Off',
    transferRequired: 'Transfer required (⚙️)',
    resetView: 'Reset view',
    startHere: 'Start here',
    setAsDestination: 'Set as destination',
    setAsStopover: 'Set as stopover',
    allLines: 'All Lines',
    normalService: 'Good Service',
    terminals: 'Terminals:',
    stationsCount: 'stations',
    allStations: 'All Stations in System',
    airportsFilter: 'Airports',
    icFilter: 'IC Rail Stations',
    accessibleFilter: 'Accessible',
    disruptionsTitle: 'Service Status & Disruptions',
    noDisruptions: 'No disruptions currently reported. All Metro and IC train lines operating normally.',
    allLinesOperational: 'Regular service on all lines',
    constructionNotice: 'Track Work & Closures',
    simulateDisruption: 'Simulate Demo Alert',
    clearDisruptions: 'Clear Alerts',
    reportDisruption: 'Report Disruption',
    reportDisruptionTitle: 'Report Line Disruption',
    reportDisruptionSubtitle: 'This report will be shared live with every user and player of this app.',
    disruptionType: 'Disruption Type',
    missingTracks: 'Missing tracks',
    missingTracksDesc: 'Tracks were mined, destroyed or are missing completely',
    inactiveRedstone: 'Inactive redstone tracks',
    inactiveRedstoneDesc: 'Powered rails lack redstone power; minecarts stall',
    emptyMinecart: 'Empty minecart',
    emptyMinecartDesc: 'Unattended empty minecart is blocking the track',
    construction: 'Track maintenance',
    constructionDesc: 'Scheduled track maintenance or rail line work',
    closure: 'Track closure',
    closureDesc: 'Section temporarily impassable or closed',
    affectedLine: 'Affected Line',
    betweenStations: 'Section between stations',
    fromStation: 'From Station',
    toStation: 'To Station',
    optionalNotes: 'Additional details / note (optional)',
    notesPlaceholder: 'e.g. Empty cart stalled right before the switch...',
    reporterName: 'Player name / Reporter (optional)',
    reporterPlaceholder: 'e.g. Steve, Alex or Conductor',
    submitReport: 'Broadcast Disruption',
    confirmDisruption: 'Confirm',
    confirmed: 'Confirmed',
    confirmationsCount: 'confirmation(s)',
    disruptionOnYourRoute: 'Warning: Disruption reported on your route!',
    planAlternativeRoute: 'Calculate alternative route without disruption',
    avoidDisruptions: 'Avoid disruptions',
    avoidDisruptionsActive: 'Bypass active',
    alternativeRouteFound: 'Disruption-free alternative route',
    alternativeRouteDesc: 'Bypasses the reported disrupted track section',
    noAlternativePossible: 'No alternative bypass possible (only existing rail connection)',
    resetBypass: 'Show standard route',
    reportSuccess: 'Disruption successfully reported to all users!',
    reportFailed: 'Failed to report disruption. Please try again.',
    metroTab: 'Metro Lines',
    icTab: 'IC Train Lines',
    settingsTitle: 'Options & Settings',
    languageSetting: 'Language',
    themeSetting: 'Appearance',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    savedTripsTitle: 'Saved Journeys',
    noSavedTrips: 'No saved journeys yet. Plan a trip and tap the bookmark icon to save it for quick access.',
    loadTrip: 'Load route',
    deleteTrip: 'Delete',
    appVersion: 'ÄÄPIZRM 044 Metro & IC Trains • Updated 2026',
    installApp: 'Install App',
    installIos: 'iOS Web App',
    offlineMode: 'Offline Mode — Local timetable active',
    close: 'Close',
    recentRoutes: 'Recent Routes',
    recentRoutesDesc: 'Quick access to your last 3 planned routes',
    lastEntry: 'Last Entry',
    loadLastRoute: 'Restore Last Route',
    noRecentRoutes: 'No recent routes yet',
    clearRecents: 'Clear recents',
    planNewTrip: 'Plan a new trip',
    emptyPlannerPrompt: 'Select origin and destination stations to compute routes.',
    lastSearched: 'Last planned',
    recentsCount: 'Last 3 Routes',
    mapRoutePlanning: 'Route Planning from Map',
    mapRoutePlanningDesc: 'Enable selecting departure, stopover, and arrival stations directly by tapping on the transit map.',
    mapStationInfoOnly: 'Info-only mode (planning disabled)',
    favorites: 'Favorites',
    favoriteStations: 'Favorite Stations',
    noFavoritesYet: 'No favorites saved yet. Tap the star ⭐ on any station to pin it here.',
    addToFavorites: 'Add to favorites',
    removeFromFavorites: 'Remove from favorites',
    tripSummary: 'Active Route on Map',
    viewInTripPlanner: 'Open in Trip Planner',
    disruptionDetails: 'Disruption Report',
    activeDisruptionOnMap: 'Track Disruption on Section',
    calculateRoute: 'Find Route',
    reportDisruptionGone: 'Disruption Resolved',
    disruptionGoneReported: 'Reported as resolved',
    metroLayerToggle: 'Metro Lines Layer',
    metroLayerOn: 'Metro: On',
    metroLayerOff: 'Metro: Off',
    expandLegend: 'Show lines',
    collapseLegend: 'Hide lines',
    hapticFeedback: 'Haptic Feedback',
    hapticFeedbackDesc: 'Tactile vibrations for interactions and route calculations (iOS style).',
    ignoreDisruption: 'Ignore Disruption',
    ignoreDisruptionTitle: 'Really ignore disruption?',
    ignoreDisruptionWarning: 'Warning: Do you really want to ignore this track disruption and continue planning the original route? Train cancellations, severe delays, or blocked tracks may occur. The disruption warning will remain clearly visible in your step-by-step itinerary.',
    proceedAnyway: 'Proceed anyway',
    cancel: 'Cancel',
    disruptionIgnoredBanner: 'Disruption ignored – standard route active.',
    reconsiderDisruption: 'Re-enable avoidance',
    disruptionOnThisLeg: 'Reported disruption on this section:',
    onlineStatus: 'Online',
    offlineStatus: 'Offline',
    offlineDisruptionWarning: 'Offline Mode active: You are offline. Timetable and routing work completely offline, but reported disruptions might not be up to date.',
    recalculateRoute: 'Recalculate Route',
    clearRoute: 'Clear route',
    home: 'Home',
    welcomeGreeting: 'Welcome to ÄÄPIZRM',
    welcomeSubtitle: 'Your modern transit navigator & official information portal for the Metro & IC Rail network.',
    latestNews: 'Network News & Articles',
    publishArticle: 'Publish Article',
    newArticleTitle: 'Compose New Article',
    articleTitle: 'Article Title',
    articleSummary: 'Summary (Preview Snippet)',
    articleContent: 'Article Content (Body)',
    articleCategory: 'Category',
    readMore: 'Read full article',
    readTime: 'min read',
    pinnedArticle: 'Pinned',
    adminSection: 'Admin Portal',
    adminCodeLabel: 'Admin Passcode',
    adminCodePlaceholder: 'Enter admin code...',
    verifyAdmin: 'Unlock Admin',
    adminActive: 'Admin Mode Active',
    adminActiveDesc: 'You are verified as an administrator and can publish official network articles.',
    exitAdmin: 'Exit Admin Mode',
    adminWrongCode: 'Invalid admin passcode. Please check your input.',
    adminSuccessCode: 'Admin mode successfully activated!',
    deleteArticle: 'Delete Article',
    deleteArticleConfirm: 'Are you sure you want to permanently remove this article?',
    editArticle: 'Edit Article',
    saveChanges: 'Save Changes',
    articleUpdated: 'Article updated successfully!',
    quickPlanTrip: 'Plan Trip',
    quickViewMap: 'Transit Map',
    networkStatus: 'Operational Status',
    allLinesOperating: 'All Metro & IC lines running normally',
    disruptionsActiveNotice: 'Active disruption(s) on the rail network',
    tabBarStyleSetting: 'Navigation Bar Style',
    tabBarStyleDesc: 'Choose between the floating iOS 26 glass dock and the classic bar.',
    tabBarStyleIOS26: 'iOS 26 Glass Dock',
    tabBarStyleClassic: 'Classic Bar',
    startupDisruptionOverview: 'Disruption overview on app launch',
    startupDisruptionOverviewDesc: 'Automatically shows a brief overview of all currently reported disruptions when launching the app.',
    refreshDataButton: 'Update data now',
    refreshDataDesc: 'Check online for new disruption reports and published articles.',
    refreshDataSuccess: 'Data successfully updated from online server!',
    refreshingData: 'Updating...',
    syncServerSetting: 'Online Synchronization',
    syncServerDesc: 'Synchronizes disruptions and articles in real-time across all users and devices.',
  },
};
