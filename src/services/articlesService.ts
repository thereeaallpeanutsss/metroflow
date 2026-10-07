import { Article } from '../types/article';
import { getApiBaseUrl } from './apiConfig';
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
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

export async function fetchArticles(): Promise<Article[]> {
  // 1. Try Firestore direct real-time cloud database
  try {
    const snap = await getDocs(collection(db, 'articles'));
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as Article);
      list.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
      saveLocalCachedArticles(list);
      return list;
    } else {
      // First time seed into Firestore
      await setDoc(doc(db, 'articles', DEFAULT_TUTORIAL_ARTICLE.id), DEFAULT_TUTORIAL_ARTICLE);
      saveLocalCachedArticles([DEFAULT_TUTORIAL_ARTICLE]);
      return [DEFAULT_TUTORIAL_ARTICLE];
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
        saveLocalCachedArticles(data.articles);
        return data.articles;
      }
    }
  } catch (err) {
    console.warn('Network fetch for articles failed, using offline cache:', err);
  }

  // 3. Fallback to localStorage cache
  return getLocalCachedArticles();
}

export async function publishArticleToServer(
  articleData: Omit<Article, 'id' | 'publishedAt'>,
  adminCode: string
): Promise<Article> {
  const newArticle: Article = {
    id: `article-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    publishedAt: Date.now(),
    ...articleData,
  };

  // 1. Save to Firestore
  try {
    await setDoc(doc(db, 'articles', newArticle.id), newArticle);
    const cached = getLocalCachedArticles();
    const updated = [newArticle, ...cached.filter((a) => a.id !== newArticle.id)];
    saveLocalCachedArticles(updated);
    return newArticle;
  } catch (err) {
    console.warn('Firestore publish failed, attempting API fallback:', err);
  }

  // 2. Save via REST API
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/articles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...articleData, adminCode }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.article) {
        const cached = getLocalCachedArticles();
        const updated = [data.article, ...cached.filter((a) => a.id !== data.article.id)];
        saveLocalCachedArticles(updated);
        return data.article;
      }
    }
  } catch (err) {
    console.warn('Server publish failed, saving locally:', err);
  }

  // 3. Fallback save locally if server route is unavailable
  const cached = getLocalCachedArticles();
  const updated = [newArticle, ...cached];
  saveLocalCachedArticles(updated);
  return newArticle;
}

export async function deleteArticleFromServer(id: string, adminCode: string): Promise<boolean> {
  // 1. Delete in Firestore
  try {
    await deleteDoc(doc(db, 'articles', id));
    const cached = getLocalCachedArticles();
    const updated = cached.filter((a) => a.id !== id);
    saveLocalCachedArticles(updated);
    return true;
  } catch (err) {
    console.warn('Firestore delete failed, attempting API fallback:', err);
  }

  // 2. Delete via REST API
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/articles/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-code': adminCode,
      },
    });
    if (res.ok) {
      const cached = getLocalCachedArticles();
      const updated = cached.filter((a) => a.id !== id);
      saveLocalCachedArticles(updated);
      return true;
    }
  } catch (err) {
    console.warn('Server delete failed, deleting locally:', err);
  }

  // 3. Fallback local deletion
  const cached = getLocalCachedArticles();
  const updated = cached.filter((a) => a.id !== id);
  saveLocalCachedArticles(updated);
  return true;
}

export async function updateArticleOnServer(
  id: string,
  articleData: Partial<Omit<Article, 'id' | 'publishedAt'>>,
  adminCode: string
): Promise<Article> {
  // 1. Update in Firestore
  try {
    await updateDoc(doc(db, 'articles', id), articleData as Record<string, any>);
    const cached = getLocalCachedArticles();
    const existing = cached.find((a) => a.id === id);
    const updatedArticle = { ...(existing || DEFAULT_TUTORIAL_ARTICLE), ...articleData, id };
    const updated = cached.map((a) => (a.id === id ? updatedArticle : a));
    saveLocalCachedArticles(updated);
    return updatedArticle;
  } catch (err) {
    console.warn('Firestore update failed, attempting API fallback:', err);
  }

  // 2. Update via REST API
  try {
    const apiBase = getApiBaseUrl();
    const res = await fetch(`${apiBase}/api/articles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...articleData, adminCode }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.article) {
        const cached = getLocalCachedArticles();
        const updated = cached.map((a) => (a.id === id ? data.article : a));
        saveLocalCachedArticles(updated);
        return data.article;
      }
    }
  } catch (err) {
    console.warn('Server update failed, updating locally:', err);
  }

  // Fallback local update
  const cached = getLocalCachedArticles();
  const existing = cached.find((a) => a.id === id);
  const updatedArticle: Article = {
    ...(existing || {
      id,
      title: articleData.title || 'Untitled',
      summary: articleData.summary || '',
      content: articleData.content || '',
      category: articleData.category || 'news',
      author: articleData.author || 'ÄÄPIZRM Verkehrsbetriebe',
      publishedAt: Date.now(),
      readTimeMinutes: 1,
    }),
    ...articleData,
  };

  const updated = cached.map((a) => (a.id === id ? updatedArticle : a));
  saveLocalCachedArticles(updated);
  return updatedArticle;
}
