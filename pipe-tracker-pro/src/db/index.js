import { openDB } from 'idb'

const DB_NAME = 'pipe-tracker-db'
const DB_VERSION = 1

let dbPromise

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('documents')) {
          const store = db.createObjectStore('documents', { keyPath: 'id' })
          store.createIndex('date', 'date')
          store.createIndex('type', 'type')
          store.createIndex('counterparty', 'counterparty')
        }
        if (!db.objectStoreNames.contains('counterparties')) {
          db.createObjectStore('counterparties', { keyPath: 'name' })
        }
      },
    })
  }
  return dbPromise
}

// === Documents ===

export async function getAllDocuments() {
  const db = await getDB()
  const docs = await db.getAllFromIndex('documents', 'date')
  return docs.reverse() // newest first
}

export async function getDocument(id) {
  const db = await getDB()
  return db.get('documents', id)
}

export async function saveDocument(doc) {
  const db = await getDB()
  if (!doc.id) {
    doc.id = crypto.randomUUID()
    doc.createdAt = new Date().toISOString()
  }
  doc.updatedAt = new Date().toISOString()
  await db.put('documents', doc)
  
  // Save counterparty if exists
  if (doc.counterparty) {
    await saveCounterparty(doc.counterparty)
  }
  
  return doc
}

export async function deleteDocument(id) {
  const db = await getDB()
  await db.delete('documents', id)
}

// === Counterparties ===

export async function getAllCounterparties() {
  const db = await getDB()
  return db.getAll('counterparties')
}

export async function saveCounterparty(name) {
  const db = await getDB()
  const existing = await db.get('counterparties', name)
  if (!existing) {
    await db.put('counterparties', { name, createdAt: new Date().toISOString() })
  }
}

export async function deleteCounterparty(name) {
  const db = await getDB()
  await db.delete('counterparties', name)
}
