import { request } from './client';

export function preprocessArticle(article) {
  return request('preprocessing', '/preprocess', {
    method: 'POST',
    body: article,
    timeoutMs: 10000,
  });
}

export function preprocessArticles(articles) {
  return request('preprocessing', '/preprocess/batch', {
    method: 'POST',
    body: articles,
    timeoutMs: 20000,
  });
}
