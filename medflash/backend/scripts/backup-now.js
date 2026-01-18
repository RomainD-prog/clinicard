#!/usr/bin/env node
// Script pour faire un backup manuel de la DB
import { backupDatabase } from '../src/backup.js';

console.log('🔄 Création d\'un backup manuel...');
const backupPath = backupDatabase();

if (backupPath) {
  console.log('✅ Backup créé avec succès !');
  console.log(`📁 Emplacement: ${backupPath}`);
  process.exit(0);
} else {
  console.error('❌ Erreur lors de la création du backup');
  process.exit(1);
}

