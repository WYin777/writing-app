import { db } from './db.js';
import {
  projects, articles, characters, timelineEvents, relations, settings
} from './stores.js';

export async function loadAll() {
  const [
    allProjects,
    allArticles,
    allCharacters,
    allTimeline,
    allRelations,
    mainSettings
  ] = await Promise.all([
    db.projects.orderBy('updatedAt').reverse().toArray(),
    db.articles.toArray(),
    db.characters.toArray(),
    db.timelineEvents.toArray(),
    db.relations.toArray(),
    db.settings.get('main')
  ]);

  projects.set(allProjects);
  articles.set(allArticles);
  characters.set(allCharacters);
  timelineEvents.set(allTimeline);
  relations.set(allRelations);
  if (mainSettings) settings.set(mainSettings);
}