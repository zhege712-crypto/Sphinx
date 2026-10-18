// A regular document supplies the About page, using the existing draft/publication boundary.
export const PROJECT_DOCUMENT_ID = '5f1a0000-0000-4000-8000-000000000001';
export const CONTRIBUTORS_DOCUMENT_ID = '5f1a0000-0000-4000-8000-000000000002';
export const isProjectDocument = document => document?.id === PROJECT_DOCUMENT_ID;
export const isContributorsDocument = document => document?.id === CONTRIBUTORS_DOCUMENT_ID;
export const isAboutDocument = document => isProjectDocument(document) || isContributorsDocument(document);
