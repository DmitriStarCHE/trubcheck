import { openDB } from 'idb'
import { randomUUID } from '../utils/uuid'

const DB_NAME = 'pipe-tracker-db'
const DB_VERSION = 2

let dbPromise

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains('documents')) {
            const store = db.createObjectStore('documents', { keyPath: 'id' })
            store.createIndex('date', 'date')
            store.createIndex('type', 'type')
            store.createIndex('counterparty', 'counterparty')
          }
          if (!db.objectStoreNames.contains('counterparties')) {
            db.createObjectStore('counterparties', { keyPath: 'name' })
          }
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains('templates')) {
            db.createObjectStore('templates', { keyPath: 'id' })
          }
        }
      },
    })
  }
  return dbPromise
}

// === Documents ===

export async function getAllDocuments() {
  try {
    const db = await getDB()
    const docs = await db.getAllFromIndex('documents', 'date')
    return docs.reverse()
  } catch (err) {
    console.error('getAllDocuments error:', err)
    throw err
  }
}

export async function getDocument(id) {
  try {
    const db = await getDB()
    return db.get('documents', id)
  } catch (err) {
    console.error('getDocument error:', err)
    throw err
  }
}

function dayKey(dateVal) {
  const d = dateVal ? new Date(dateVal) : new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function saveDocument(doc) {
  try {
    const db = await getDB()
    if (!doc.id) {
      doc.id = randomUUID()
      doc.createdAt = new Date().toISOString()
      const key = dayKey(doc.date)
      const allDocs = await db.getAll('documents')
      const sameDay = allDocs.filter(d => d.date && dayKey(d.date) === key)
      doc.docNumber = sameDay.length + 1
    }
    doc.updatedAt = new Date().toISOString()
    await db.put('documents', doc)
    if (doc.counterparty) {
      await saveCounterparty(doc.counterparty)
    }
    return doc
  } catch (err) {
    console.error('saveDocument error:', err)
    throw err
  }
}

export async function updateDocument(doc) {
  try {
    const db = await getDB()
    doc.updatedAt = new Date().toISOString()
    await db.put('documents', doc)
    if (doc.counterparty) {
      await saveCounterparty(doc.counterparty)
    }
    return doc
  } catch (err) {
    console.error('updateDocument error:', err)
    throw err
  }
}

export async function deleteDocument(id) {
  try {
    const db = await getDB()
    await db.delete('documents', id)
  } catch (err) {
    console.error('deleteDocument error:', err)
    throw err
  }
}

// === Counterparties ===

export async function getAllCounterparties() {
  try {
    const db = await getDB()
    return db.getAll('counterparties')
  } catch (err) {
    console.error('getAllCounterparties error:', err)
    throw err
  }
}

export async function saveCounterparty(name) {
  try {
    const db = await getDB()
    const existing = await db.get('counterparties', name)
    if (!existing) {
      await db.put('counterparties', { name, createdAt: new Date().toISOString() })
    }
  } catch (err) {
    console.error('saveCounterparty error:', err)
    throw err
  }
}

export async function deleteCounterparty(name) {
  try {
    const db = await getDB()
    await db.delete('counterparties', name)
  } catch (err) {
    console.error('deleteCounterparty error:', err)
    throw err
  }
}

// === Templates ===

export async function getAllTemplates() {
  try {
    const db = await getDB()
    return db.getAll('templates')
  } catch (err) {
    console.error('getAllTemplates error:', err)
    throw err
  }
}

export async function saveTemplate(tpl) {
  try {
    const db = await getDB()
    if (!tpl.id) {
      tpl.id = randomUUID()
      tpl.createdAt = new Date().toISOString()
    }
    await db.put('templates', tpl)
    return tpl
  } catch (err) {
    console.error('saveTemplate error:', err)
    throw err
  }
}

export async function deleteTemplate(id) {
  try {
    const db = await getDB()
    await db.delete('templates', id)
  } catch (err) {
    console.error('deleteTemplate error:', err)
    throw err
  }
}
