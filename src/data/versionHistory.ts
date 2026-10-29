export type ReleaseType = 'major' | 'minor' | 'patch';

export interface VersionEntry {
  version: string; // e.g. "0.4.5"
  date: string; // e.g. "29.10.2026"
  type: ReleaseType;
  title: string;
  titleDe: string;
  summary: string;
  summaryDe: string;
  changes: string[];
  changesDe: string[];
  isLatest?: boolean;
}

/**
 * Current version follows semantic versioning x.y.z:
 * x = Major release with new features and fundamental architectural changes (NEVER changed automatically)
 * y = Addition of minor features and general enhancements (incremented upwards)
 * z = Small bug fixes, performance improvements, and minor adjustments (incremented upwards)
 */
export const CURRENT_VERSION = '0.4.5';

export const VERSION_HISTORY: VersionEntry[] = [
  {
    version: '0.4.5',
    date: '29.10.2026',
    type: 'patch',
    isLatest: true,
    title: 'Modern Minecraft UI, Header Time & Version History System',
    titleDe: 'Modernes Minecraft UI, Header-Uhrzeit & Versionsverlauf-System',
    summary:
      'Overhauled the Minecraft theme for both Light and Dark modes, made time permanently visible next to top alerts, added comprehensive Version History tracking, and resolved GitHub push payload limits.',
    summaryDe:
      'Modernisierung des Minecraft-Designs für Hell- und Dunkelmodus, dauerhafte HH:MM Zeitanzeige in der oberen Leiste, integrierter Versionsverlauf mit Update-Benachrichtigung und Behebung von GitHub-Push-Fehlern.',
    changes: [
      'Added permanent HH:MM time display next to alerts in both Classical and iOS header styles across all screen widths.',
      'Modernized Minecraft Bedrock/Dungeons edition UI with clean 2px-3px pixel bevels and high-contrast typography.',
      'Optimized Minecraft Light Mode (Birch/Sandstone/Quartz) with warm sandy backgrounds and high-contrast charcoal text.',
      'Optimized Minecraft Dark Mode (Deepslate/Obsidian/Netherite) with deep slate textures and bright neon yellow active tab bloom.',
      'Added interactive Version History viewer accessible from Settings with complete changelog sorted newest-to-oldest.',
      'Implemented first-launch update notification banner alerting users when a new version is released.',
      'Fixed GitHub commit push payload error by excluding large chat media attachments (*.mov) from repo commits.',
    ],
    changesDe: [
      'Dauerhafte Zeitanzeige im Format HH:MM neben den Störungsmeldungen in der oberen Leiste (klassisch & iOS) auf allen Bildschirmbreiten.',
      'Modernisierung des Minecraft Bedrock/Dungeons-Designs mit sauberen 2px-3px Pixel-Kanten und optimierter Lesbarkeit.',
      'Vollständige Optimierung des Minecraft-Hellmodus (Birke/Sandstein/Quarz) mit warmem Hintergrund und kontrastreichem Text.',
      'Vollständige Optimierung des Minecraft-Dunkelmodus (Tiefenschiefer/Obsidian/Netherit) mit leuchtendem Neongelb-Effekt für aktive Tabs.',
      'Neuer interaktiver Versionsverlauf in den Einstellungen mit chronologischer Liste aller Änderungen seit App-Erstellung.',
      'Automatische Benachrichtigung beim ersten Start nach einem Update mit Versionsangabe und Direktlink zu den Neuerungen.',
      'Behebung des Fehlers beim GitHub-Push durch Ausschluss großer Video-Anhänge (*.mov) aus den Repository-Commits.',
    ],
  },
  {
    version: '0.4.4',
    date: '29.10.2026',
    type: 'patch',
    title: 'Map Pan/Zoom Performance & Classical UI Time Window',
    titleDe: 'Karten-Performance (60–120 FPS) & Klassisches Header-Zeitfenster',
    summary:
      'Eliminated map pan/zoom stutter when selecting lines/stations, and introduced an interactive top bar time & disruption window for the Classical UI.',
    summaryDe:
      'Beseitigung von Rucklern beim Verschieben/Zoomen der Karte bei ausgewählten Linien/Stationen sowie interaktives Zeit- und Störungsfenster in der klassischen Leiste.',
    changes: [
      'Implemented requestAnimationFrame coalescing for map panning, delivering smooth 60–120fps navigation.',
      'Dynamic Gaussian blur bypass during active map drag gestures to prevent GPU compositor frame drops.',
      'Added time and alert pill to Classical UI header with live ticking clock modal (hh:mm:ss) and date (dd.mm.yyyy).',
      'Memoized disruption filtering on station and line info cards to eliminate redundant array iterations.',
    ],
    changesDe: [
      'Implementierung von requestAnimationFrame für ruckelfreies Verschieben und Zoomen der Netzkarte bei 60–120 FPS.',
      'Dynamische Deaktivierung des teuren Gaußschen Weichzeichners während des Kartenziehens zur Vermeidung von Rucklern.',
      'Neues interaktives Zeit- und Störungs-Badge in der klassischen Kopfzeile mit Sekundentakt (hh:mm:ss) und Datum (dd.mm.yyyy).',
      'Memoisiertes Filtern von Störungsmeldungen bei Stations- und Linien-Karten zur Reduzierung der Rechenlast.',
    ],
  },
  {
    version: '0.4.3',
    date: '27.10.2026',
    type: 'patch',
    title: 'U-Grün Track Course Realignment & Retina Subpixel Map',
    titleDe: 'Streckenanpassung U-Grün & Retina Subpixel-Schärfe',
    summary:
      'Corrected U-Grün metro routing between Badesee and Kellrods Airport via Carl Station, and optimized subpixel vector rendering.',
    summaryDe:
      'Korrektur des Streckenverlaufs der U-Grün zwischen Badesee und Kellrods Airport über Carl Station sowie gestochen scharfe Vektor-Skalierung.',
    changes: [
      'Rerouted U-Grün physical tracks between Badesee, Carl Station, and Kellrods Airport to match official network course.',
      'Synchronized smooth non-lagging cubic-bezier easing curve [0.32, 0.72, 0, 1] for collapsible map cards.',
      'Fixed drag selection lens alignment in floating navigation bar.',
    ],
    changesDe: [
      'Anpassung des Streckenverlaufs der U-Grün zwischen Badesee, Carl Station und Kellrods Airport gemäß Netzplan.',
      'Synchronisierte kubische Easing-Kurve [0.32, 0.72, 0, 1] für geschmeidiges Auf- und Zuklappen der Karten-Infofenster.',
      'Verbesserte Positionierung der Glaslinse in der schwebenden Menüleiste beim Wischen.',
    ],
  },
  {
    version: '0.4.2',
    date: '26.10.2026',
    type: 'patch',
    title: 'Minecraft Optical Glass Transparency & Pulsing Glow',
    titleDe: 'Minecraft Glas-Transparenz & Pulsierender Neon-Glow',
    summary:
      'Enhanced the Minecraft hotbar with an authentic transparent optical glass lens and vibrant neon yellow enchantment bloom on active tabs.',
    summaryDe:
      'Verbesserte Transparenz der Glaslinse in der Minecraft-Hotbar sowie leuchtender, pulsierender neongelber Verzauberungseffekt auf dem aktiven Tab.',
    changes: [
      'Added pulsing neon yellow outer-glow bloom effect to active Minecraft tab icon and label.',
      'High-transparency optical glass lens over stone hotbar slots.',
      'Enhanced tactile haptic tick feedback on menu tab hover during dragging.',
    ],
    changesDe: [
      'Pulsierender neongelber Schein- und Bloom-Effekt für das aktive Icon und den Text in der Minecraft-Menüleiste.',
      'Hochtransparente optische Glaslinse über den Stein-Slots der Hotbar.',
      'Spürbares haptisches Feedback beim Überstreichen der Menü-Tabs.',
    ],
  },
  {
    version: '0.4.1',
    date: '25.10.2026',
    type: 'minor',
    title: 'Minecraft Bedrock & Java Edition Retro Theme',
    titleDe: 'Minecraft Bedrock & Java Edition Retro-Design',
    summary:
      'Introduced authentic Minecraft pixel theme with blocky panels, stone hotbar navigation, and retro arcade typography.',
    summaryDe:
      'Einführung des authentischen Minecraft-Pixel-Designs mit Block-Fenstern, Stein-Hotbar und Retro-Typografie.',
    changes: [
      'Added Minecraft design mode switch in Settings (unlocked via Admin or theme selector).',
      'Integration of retro pixel typography ("Press Start 2P" and "VT323").',
      'Minecraft HUD top bar, item slot inputs, and 3D beveled stone buttons.',
    ],
    changesDe: [
      'Neuer Minecraft-Designmodus in den Einstellungen wählbar.',
      'Integration der Retro-Pixelfonts („Press Start 2P“ und „VT323“).',
      'Minecraft-HUD-Kopfzeile, Item-Slot-Eingabefelder und 3D-abgeschrägte Stein-Buttons.',
    ],
  },
  {
    version: '0.4.0',
    date: '24.10.2026',
    type: 'minor',
    title: 'Apple iOS Design Overhaul & 3D Liquid Glass Dock',
    titleDe: 'Apple iOS Design-Overhaul & 3D Liquid Glass Dock',
    summary:
      'Complete iOS-inspired design system with frosted glass cards, dynamic gestures, and floating Liquid Glass dock navigation.',
    summaryDe:
      'Vollständiges iOS-inspiriertes Designsystem mit Milchglas-Karten, nativen Wischgesten und schwebendem Liquid Glass Dock.',
    changes: [
      'Designed iOS overhaul theme with Apple SF Pro typography and frosted glass UI.',
      'Interactive 3D optical Liquid Glass floating dock menu bar with physical drag lens.',
      'Dynamic Island top header bar with real-time transit status capsule and quick shortcuts.',
      'Draggable and collapsible bottom sheets for stations, lines, and disruption reports.',
    ],
    changesDe: [
      'iOS-Designmodus mit Apple SF Pro Typografie und Milchglas-Oberflächen.',
      'Interaktive schwebende 3D Liquid Glass Menüleiste mit physikalischer Wischlinse.',
      'Dynamic Island Kopfzeile mit Live-Netzwerkstatus und Schnellzugriffen.',
      'Frei verschiebbare und einklappbare Informationsfenster für Stationen und Linien auf der Karte.',
    ],
  },
  {
    version: '0.3.2',
    date: '22.10.2026',
    type: 'patch',
    title: 'Hazard Striped Rail Track Disruption Overlays',
    titleDe: 'Gestreifte Warnstrecken auf der physischen Netzkarte',
    summary:
      'Physical rail lines automatically display animated hazard warning stripes during active track closures or construction.',
    summaryDe:
      'Gleisabschnitte auf der Karte zeigen bei Sperrungen oder Bauarbeiten automatisch animierte rot-gelbe Warnstreifen.',
    changes: [
      'High-visibility danger striped tracks painted directly along physical railway paths on the map.',
      'Interactive warning markers with disruption type badges and affected station ranges.',
      'Admin moderation tools for editing and deleting disruption reports directly from map popups.',
    ],
    changesDe: [
      'Hochsichtbare rot-gelb gestreifte Warnstrecken direkt auf den Gleisen bei aktiven Störungen.',
      'Interaktive Warnsymbole mit Linien-Badges und betroffenen Streckenabschnitten.',
      'Admin-Werkzeuge zum Bearbeiten und Löschen von Störungen direkt aus der Karte.',
    ],
  },
  {
    version: '0.3.1',
    date: '20.10.2026',
    type: 'patch',
    title: 'Intelligent Disruption Avoidance in Routing',
    titleDe: 'Intelligente Störungsumfahrung bei der Routenplanung',
    summary:
      'Dijkstra journey engine dynamically reroutes passengers around closed tracks and displays detour warnings.',
    summaryDe:
      'Dijkstra-Routing umfährt gesperrte Streckenabschnitte dynamisch und berechnet alternative Umsteigeverbindungen.',
    changes: [
      'Added toggle to automatically avoid reported track disruptions during route calculations.',
      'Route summary cards show disruption warning badges and detour notifications.',
      'Recent route history quick access persisting the last 3 planned connections.',
    ],
    changesDe: [
      'Schalter zur automatischen Umfahrung gemeldeter Streckenstörungen bei der Routenberechnung.',
      'Verbindungskarten zeigen Warnhinweise bei betroffenen Umstiegen.',
      'Schnellzugriff auf die letzten 3 geplanten Routen mit dauerhafter Speicherung.',
    ],
  },
  {
    version: '0.3.0',
    date: '18.10.2026',
    type: 'minor',
    title: 'Real-Time Cloud Disruption Reporting & News Publishing',
    titleDe: 'Echtzeit-Störungsmeldungen & Startseiten-News-System',
    summary:
      'Multi-device cloud synchronization with community upvotes, auto-resolution after 10 reports, and admin article publishing.',
    summaryDe:
      'Geräteübergreifende Echtzeit-Cloud-Synchronisation, Community-Bestätigungen, automatische Behebung nach 10 Meldungen und News-Veröffentlichung.',
    changes: [
      'Firestore real-time cloud database integration for instant cross-device disruption synchronization.',
      'Community verification endorsements and auto-resolution after 10 user resolved reports.',
      'Admin verification code ("abc123") unlocking news and tutorial publishing on the Home page.',
      'Startup disruption notification modal alerting users to ongoing network alerts upon launch.',
    ],
    changesDe: [
      'Firestore Echtzeit-Cloud-Datenbank für sekundenschnelle Synchronisation zwischen allen Geräten.',
      'Community-Bestätigungen für Störungen und automatische Löschung nach 10 Behebungs-Meldungen.',
      'Admin-Code („abc123“) zum Verfassen von News-Artikeln und Anleitungen auf der Startseite.',
      'Start-Übersichtsfenster informiert beim Öffnen der App direkt über alle aktiven Störungen.',
    ],
  },
  {
    version: '0.2.1',
    date: '15.10.2026',
    type: 'patch',
    title: 'Tactile Haptics & Accessibility Station Indicators',
    titleDe: 'Haptisches Feedback & Barrierefreiheits-Kennzeichnung',
    summary:
      'Integrated native tactile haptic vibrations for buttons and gestures, and added accessibility station tags.',
    summaryDe:
      'Integration nativer Vibrationen für Menüs und Buttons sowie Kennzeichnung barrierefreier Bahnhöfe.',
    changes: [
      'Web Haptic Feedback engine providing crisp tactile clicks on buttons, tabs, and calculated routes.',
      'Accessibility indicators (wheelchair ♿, airport ✈, and InterCity 🚆) on station cards.',
      'Interactive legend drawer explaining network symbols and line badges.',
    ],
    changesDe: [
      'Web-Haptik-Engine mit präzisen Vibrations-Rückmeldungen bei Klicks, Wischgesten und Routenberechnung.',
      'Kennzeichnung barrierefreier Bahnhöfe (♿), Flughafen-Bahnhöfe (✈) und IC-Halte (🚆).',
      'Interaktive Legende zur Erklärung aller Symbole und Linien-Kennzeichnungen.',
    ],
  },
  {
    version: '0.2.0',
    date: '12.10.2026',
    type: 'minor',
    title: 'Stopover Route Planning & InterCity (IC) Network Layer',
    titleDe: 'Zwischenstation-Routenplanung („Über“) & InterCity-Ebene',
    summary:
      'Support for multi-leg journeys via intermediate stopover stations, and dedicated InterCity high-speed network layer.',
    summaryDe:
      'Routenplanung mit frei wählbaren Zwischenhalten („Über“-Station) sowie zuschaltbare InterCity-Schnellzug-Ebene.',
    changes: [
      'Multi-leg route calculation supporting an optional intermediate stopover station ("Über").',
      'Dedicated InterCity Express (IC 10, IC 11, IC Airport) layer toggle on the interactive map.',
      'Favorite journey bookmarks stored in local storage with one-tap recall.',
      'Route preference filtering (Fastest, Fewest Transfers, Prioritize Metro, Prioritize IC).',
    ],
    changesDe: [
      'Erweiterte Routenberechnung mit frei wählbarer Zwischenstation („Über“).',
      'Eigener InterCity-Schalter (IC 10, IC 11, IC Airport) auf der interaktiven Karte.',
      'Speichern von Lieblings-Verbindungen als Favoriten für den Schnellabruf.',
      'Routen-Präferenzen (Schnellste, Wenigste Umstiege, U-Bahn bevorzugen, IC bevorzugen).',
    ],
  },
  {
    version: '0.1.1',
    date: '08.10.2026',
    type: 'patch',
    title: 'Station Info Sheets & PWA Offline Caching',
    titleDe: 'Stations-Detailkarten & Offline-Fähigkeit (PWA)',
    summary:
      'Rich station detail sheets with connecting lines and frequencies, along with full offline PWA functionality.',
    summaryDe:
      'Detaillierte Stations-Infokarten mit allen Linien und Takten sowie vollständige Offline-Nutzung als PWA.',
    changes: [
      'Interactive station bottom sheets displaying connecting lines, frequencies, and quick route origin/destination buttons.',
      'Progressive Web App (PWA) manifest and service worker for offline operation on iOS and Android.',
      'Local caching for planned routes and station directories.',
    ],
    changesDe: [
      'Interaktive Stationsfenster mit allen angebundenen Linien, Takten und Schnellstart-Buttons.',
      'Progressive Web App (PWA) für die Nutzung ohne Internetverbindung auf iOS und Android.',
      'Lokales Caching für Fahrpläne und Stationsdaten.',
    ],
  },
  {
    version: '0.1.0',
    date: '01.10.2026',
    type: 'major',
    title: 'Initial Release: MetroFlow ÄÄPIZRM 044 Metro Router',
    titleDe: 'Erstveröffentlichung: MetroFlow ÄÄPIZRM 044 U-Bahn Navigator',
    summary:
      'Inaugural launch of MetroFlow for the 27-station ÄÄPIZRM 044 transit network with interactive vector map and route planner.',
    summaryDe:
      'Offizielle Veröffentlichung von MetroFlow für das 27-Stationen-Netz der ÄÄPIZRM 044 mit interaktiver Vektorkarte und Routenplaner.',
    changes: [
      'Complete interactive SVG map of the 27-station ÄÄPIZRM 044 rail network (U1–U9 lines and Tim Train).',
      'High-speed Dijkstra shortest-path route planner calculating travel time and transfers.',
      'Station search with instant autocomplete and centering on map.',
      'Dark and Light theme switching with bilingual German and English support.',
    ],
    changesDe: [
      'Vollständige interaktive Vektorkarte des 27-Stationen-Netzes der ÄÄPIZRM 044 (U1–U9 und Tim Train).',
      'Dijkstra-Routing-Algorithmus zur Berechnung der schnellsten Verbindung inkl. Umstiegsanzeige.',
      'Stationssuche mit Autovervollständigung und automatischer Zentrierung auf der Karte.',
      'Heller und dunkler Modus mit zweisprachiger Unterstützung (Deutsch & Englisch).',
    ],
  },
];
