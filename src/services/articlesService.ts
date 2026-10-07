import { Article } from '../types/article';
import { getApiBaseUrl } from './apiConfig';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const ARTICLES_CACHE_KEY = 'metroflow_cached_articles';

export const DEFAULT_TUTORIAL_ARTICLE: Article = {
  id: 'article-tutorial-intro',
  title: 'Willkommen bei MetroFlow: Offizielle Einführung & App-Anleitung',
  titleEn: 'Welcome to MetroFlow: Official Introduction & App Guide',
  summary: 'Dein ultimativer Begleiter für das ÄÄPIZRM U-Bahn & IC-Netz. Lerne, wie du Routen planst, Störungen meldest und die interaktive Karte optimal nutzt.',
  summaryEn: 'Your ultimate companion for the ÄÄPIZRM Metro & IC network. Learn how to plan routes, report disruptions, and make the most of the interactive transit map.',
  category: 'tutorial',
  author: 'ÄÄPIZRM Verkehrsbetriebe',
  publishedAt: 1727784000000,
  readTimeMinutes: 3,
  pinned: true,
  tags: ['Tutorial', 'U-Bahn', 'IC-Express', 'Offline-Modus'],
  content: `Willkommen bei MetroFlow – der maßgeschneiderten Navigations- und Informationsplattform für das Schienennetz von ÄÄPIZRM!

Diese App wurde entwickelt, um dir schnelle, verlässliche und komfortable Verbindungen durch die gesamte Metropolregion zu ermöglichen. Hier ist dein kompakter Leitfaden durch die wichtigsten Funktionen:

1. 🧭 Intelligenter Reiseplaner (Tab 'Plan')
• Wähle deine Start- und Zielstation entweder über das Suchfeld, aus den Favoriten oder den häufig gesuchten Stationen.
• Optionaler Zwischenstopp (Via): Füge mit nur einem Klick eine Umsteigestation deiner Wahl ein.
• Flexible Priorisierung: Wähle zwischen 'Schnellste Route', 'Wenigste Umstiege', 'U-Bahn bevorzugen' oder 'IC-Züge bevorzugen' – direkt im Planungsfenster.
• Berechnete Routen werden übersichtlich über deinen letzten Fahrten dargestellt – mit sofortigem Überblick über Fahrzeit, Umstiege und genaue Zwischenhalte.

2. 🗺️ Interaktive Netzkarte (Tab 'Karte')
• Stufenlos zoombare und verschiebbare Vektorkarte aller 6 U-Bahn-Linien, 7 IC-Express-Linien sowie des Tim-Train.
• Tippe auf eine beliebige Station, um sie direkt als Start oder Ziel zu setzen, Abfahrten einzusehen oder auf Stationsebene zu navigieren.
• Mit dem Button 'In Reiseplaner ansehen' wird jede auf der Karte berechnete Verbindung direkt mit allen Details im Routenplaner geöffnet.
• Über das Ebenen-Menü kannst du die U-Bahn- oder IC-Linien separat ein- und ausblenden.

3. ⚠️ Live-Störungsmeldungen & Umfahrungen
• Gemeinschaftliches Meldesystem: Sollte ein Gleisabschnitt blockiert sein oder eine Weiche ausfallen, wird die Störung in Echtzeit geteilt.
• Du kannst Störungen bestätigen (+1) oder als behoben melden. Nach 10 Entwarnungen wird die Störung automatisch entfernt.
• Bei aktiven Störungen auf deiner Route bietet der Routenplaner eine automatische Umfahrung – oder die Option, die Störung nach Bestätigung bewusst zu ignorieren.

4. 📱 Vollständige Offline-Funktionalität
• MetroFlow funktioniert überall – auch im tiefsten Tunnel ohne Internetempfang! Alle Netzdaten, Fahrpläne und gespeicherten Routen verbleiben sicher auf deinem Gerät.
• Ein Indikator am oberen Bildschirmrand zeigt dir jederzeit an, ob du online oder offline bist.

5. ⚙️ Individuelle Einstellungen & Komfort
• Personalisiere dein Reiseerlebnis mit Dark/Light Mode, Sprachauswahl (Deutsch/Englisch) und präzisem iOS Taptic Feedback.
• Speichere deine häufigsten Fahrten und Stationen für schnellen Zugriff jederzeit ab.
• Bleibe über diese Startseite immer auf dem neuesten Stand zu Fahrplanänderungen und Netzwerknachrichten.

Gute Fahrt wünscht dir das gesamte Team von ÄÄPIZRM!`,
  contentEn: `Welcome to MetroFlow – the tailored navigation and transit information platform for the ÄÄPIZRM rail network!

This app was designed to provide swift, reliable, and seamless journey planning across the entire metropolitan area. Here is a quick guide to getting the most out of MetroFlow:

1. 🧭 Smart Journey Planner ('Plan' Tab)
• Select your origin and destination either via search, pinned favorites, or frequently searched stations.
• Optional Stopover (Via): Add an intermediate station with a single tap.
• Custom Routing Priorities: Choose between 'Fastest Route', 'Fewest Transfers', 'Prioritize Metro', or 'Prioritize IC Trains' directly inside the planner window.
• Calculated routes appear prominently above recent routes, giving you instant access to travel times, transfer points, and all intermediate stops.

2. 🗺️ Interactive Transit Map ('Map' Tab)
• Smooth zoom and pan across all 6 Metro lines, 7 IC Express lines, and the Tim-Train.
• Tap any station marker to select it as Start or Destination, view next departures, or inspect interchange connections.
• The 'View in Trip Planner' button instantly opens any route calculated on the map inside the trip planner.
• Toggle Metro and IC network layers independently to focus on your preferred transit mode.

3. ⚠️ Live Disruption Reporting & Detours
• Community alert system: If a track section or switch experiences issues, disruptions are reported live for all passengers.
• You can upvote disruptions or report them as resolved. Once 10 users confirm resolution, the alert is automatically removed.
• When disruptions affect your itinerary, MetroFlow offers automatic bypasses – or allows you to acknowledge and proceed on the original route.

4. 📱 Complete Offline Support
• MetroFlow works seamlessly even deep underground with zero connectivity. Map data, stations, and saved journeys remain cached locally.
• An offline status banner keeps you informed whenever network connectivity is interrupted.

5. ⚙️ Personal Settings & Comfort
• Customize your transit experience with Dark/Light themes, bilingual language selection (English/German), and iOS Taptic tactile feedback.
• Bookmark your favorite journeys and stations for instant one-tap access.
• Stay tuned to this Home portal for official network announcements and transit updates.

Have a pleasant trip across ÄÄPIZRM!`
};

/**
 * Removes any undefined values to prevent Firestore SDK validation errors
 */
function sanitizeForFirestore(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (Array.isArray(val)) {
        clean[key] = val.filter((item) => item !== undefined);
      } else if (val !== null && typeof val === 'object') {
        clean[key] = sanitizeForFirestore(val);
      } else {
        clean[key] = val;
      }
    }
  }
  return clean;
}

export function getLocalCachedArticles(): Article[] {
  try {
    const raw = localStorage.getItem(ARTICLES_CACHE_KEY);
    if (!raw) return [DEFAULT_TUTORIAL_ARTICLE];
    const parsed: Article[] = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [DEFAULT_TUTORIAL_ARTICLE];
  } catch {
    return [DEFAULT_TUTORIAL_ARTICLE];
  }
}

export function saveLocalCachedArticles(articles: Article[]): void {
  try {
    localStorage.setItem(ARTICLES_CACHE_KEY, JSON.stringify(articles));
  } catch {}
}

/**
 * Fetches all published articles from Firestore or API, merging with local cache.
 */
export async function fetchArticles(): Promise<Article[]> {
  const local = getLocalCachedArticles();

  // 1. Try Firestore direct real-time cloud database
  try {
    const snap = await getDocs(collection(db, 'articles'));
    if (!snap.empty) {
      const list: Article[] = snap.docs.map((d) => d.data() as Article);

      // Merge with local cache so articles never disappear
      const map = new Map<string, Article>();
      for (const a of local) {
        map.set(a.id, a);
      }
      for (const fa of list) {
        map.set(fa.id, fa);
      }

      if (!map.has(DEFAULT_TUTORIAL_ARTICLE.id)) {
        map.set(DEFAULT_TUTORIAL_ARTICLE.id, DEFAULT_TUTORIAL_ARTICLE);
      }

      const merged = Array.from(map.values()).sort(
        (a, b) => (b.publishedAt || 0) - (a.publishedAt || 0)
      );

      saveLocalCachedArticles(merged);
      return merged;
    } else {
      // First time seed default article into Firestore
      try {
        await setDoc(doc(db, 'articles', DEFAULT_TUTORIAL_ARTICLE.id), sanitizeForFirestore(DEFAULT_TUTORIAL_ARTICLE));
      } catch {}
      return local.length > 0 ? local : [DEFAULT_TUTORIAL_ARTICLE];
    }
  } catch (err) {
    console.warn('Firestore fetch for articles failed, attempting API fallback:', err);
  }

  // 2. Fallback to API
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/articles`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.articles) && data.articles.length > 0) {
        const map = new Map<string, Article>();
        for (const a of local) {
          map.set(a.id, a);
        }
        for (const sa of data.articles) {
          map.set(sa.id, sa);
        }
        if (!map.has(DEFAULT_TUTORIAL_ARTICLE.id)) {
          map.set(DEFAULT_TUTORIAL_ARTICLE.id, DEFAULT_TUTORIAL_ARTICLE);
        }
        const merged = Array.from(map.values()).sort(
          (a, b) => (b.publishedAt || 0) - (a.publishedAt || 0)
        );
        saveLocalCachedArticles(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('Network fetch for articles failed, using offline cache:', err);
  }

  // 3. Fallback to localStorage cache
  return local.length > 0 ? local : [DEFAULT_TUTORIAL_ARTICLE];
}

/**
 * Real-time Firestore synchronization for articles across all devices.
 */
export function subscribeToArticles(callback: (articles: Article[]) => void): () => void {
  try {
    const unsubscribe = onSnapshot(
      collection(db, 'articles'),
      (snap) => {
        if (!snap.empty) {
          const list: Article[] = snap.docs.map((d) => d.data() as Article);
          const local = getLocalCachedArticles();
          const map = new Map<string, Article>();
          for (const a of local) {
            map.set(a.id, a);
          }
          for (const fa of list) {
            map.set(fa.id, fa);
          }
          if (!map.has(DEFAULT_TUTORIAL_ARTICLE.id)) {
            map.set(DEFAULT_TUTORIAL_ARTICLE.id, DEFAULT_TUTORIAL_ARTICLE);
          }
          const merged = Array.from(map.values()).sort(
            (a, b) => (b.publishedAt || 0) - (a.publishedAt || 0)
          );
          saveLocalCachedArticles(merged);
          callback(merged);
        }
      },
      (err) => {
        console.warn('Firestore onSnapshot error for articles:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach Firestore snapshot listener for articles:', err);
    return () => {};
  }
}

/**
 * Publishes an article and synchronizes it immediately across Firestore and REST API.
 */
export async function publishArticleToServer(
  articleData: Omit<Article, 'id' | 'publishedAt'>,
  adminCode: string
): Promise<Article> {
  const cleanArticle: Article = {
    id: `article-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    publishedAt: Date.now(),
    title: articleData.title?.trim() || 'Untitled',
    titleEn: articleData.titleEn?.trim() || articleData.title?.trim() || '',
    summary: articleData.summary?.trim() || articleData.title?.trim() || '',
    summaryEn: articleData.summaryEn?.trim() || articleData.summary?.trim() || '',
    content: articleData.content?.trim() || '',
    contentEn: articleData.contentEn?.trim() || articleData.content?.trim() || '',
    category: articleData.category || 'news',
    author: articleData.author?.trim() || 'ÄÄPIZRM Verkehrsbetriebe',
    readTimeMinutes: articleData.readTimeMinutes || 1,
    pinned: Boolean(articleData.pinned),
    tags: Array.isArray(articleData.tags) ? articleData.tags.filter(Boolean) : [],
  };

  // 1. Direct write to Firestore for instant cross-device synchronization
  try {
    const firestoreData = sanitizeForFirestore(cleanArticle);
    await setDoc(doc(db, 'articles', cleanArticle.id), firestoreData);
    const cached = getLocalCachedArticles();
    const updated = [cleanArticle, ...cached.filter((a) => a.id !== cleanArticle.id)];
    saveLocalCachedArticles(updated);
  } catch (err) {
    console.warn('Firestore publish failed, attempting API fallback:', err);
  }

  // 2. Also save via REST API (dual-sync)
  try {
    const apiBase = getApiBaseUrl();
    await fetch(`${apiBase}/api/articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cleanArticle, adminCode }),
    });
  } catch (err) {
    console.warn('REST API publish fallback:', err);
  }

  const cached = getLocalCachedArticles();
  const updated = [cleanArticle, ...cached.filter((a) => a.id !== cleanArticle.id)];
  saveLocalCachedArticles(updated);
  return cleanArticle;
}

/**
 * Deletes an article from Firestore and REST API.
 */
export async function deleteArticleFromServer(id: string, adminCode: string): Promise<boolean> {
  // 1. Delete in Firestore
  try {
    await deleteDoc(doc(db, 'articles', id));
  } catch (err) {
    console.warn('Firestore delete failed, attempting API fallback:', err);
  }

  // 2. Delete via REST API
  try {
    const apiBase = getApiBaseUrl();
    await fetch(`${apiBase}/api/articles/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-code': adminCode,
      },
    });
  } catch (err) {
    console.warn('Server delete fallback:', err);
  }

  const cached = getLocalCachedArticles();
  const updated = cached.filter((a) => a.id !== id);
  saveLocalCachedArticles(updated);
  return true;
}

/**
 * Updates an article in Firestore and REST API.
 */
export async function updateArticleOnServer(
  id: string,
  articleData: Partial<Omit<Article, 'id' | 'publishedAt'>>,
  adminCode: string
): Promise<Article> {
  const cached = getLocalCachedArticles();
  const existing = cached.find((a) => a.id === id);
  const updatedArticle: Article = {
    ...(existing || DEFAULT_TUTORIAL_ARTICLE),
    ...articleData,
    id,
    title: articleData.title?.trim() || existing?.title || 'Untitled',
    summary: articleData.summary?.trim() || existing?.summary || '',
    content: articleData.content?.trim() || existing?.content || '',
    category: articleData.category || existing?.category || 'news',
    author: articleData.author?.trim() || existing?.author || 'ÄÄPIZRM Verkehrsbetriebe',
    pinned: articleData.pinned !== undefined ? Boolean(articleData.pinned) : Boolean(existing?.pinned),
    tags: Array.isArray(articleData.tags) ? articleData.tags.filter(Boolean) : existing?.tags || [],
  };

  // 1. Update in Firestore
  try {
    const firestoreData = sanitizeForFirestore(updatedArticle);
    await setDoc(doc(db, 'articles', id), firestoreData, { merge: true });
  } catch (err) {
    console.warn('Firestore update failed, attempting API fallback:', err);
  }

  // 2. Update via REST API
  try {
    const apiBase = getApiBaseUrl();
    await fetch(`${apiBase}/api/articles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updatedArticle, adminCode }),
    });
  } catch (err) {
    console.warn('Server update fallback:', err);
  }

  const updated = cached.map((a) => (a.id === id ? updatedArticle : a));
  saveLocalCachedArticles(updated);
  return updatedArticle;
}
