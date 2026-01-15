import { copyFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function backupDatabase() {
  const dbPath = process.env.DB_PATH || join(__dirname, '../data/medflash.db');
  const backupDir = join(__dirname, '../data/backups');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = join(backupDir, `medflash-${timestamp}.db`);
  
  try {
    // Créer le dossier backups s'il n'existe pas
    mkdirSync(backupDir, { recursive: true });
    
    // Copier la DB
    copyFileSync(dbPath, backupPath);
    console.log(`✅ Backup créé: ${backupPath}`);
    
    // Cleanup: garder seulement les 7 derniers backups
    const backups = readdirSync(backupDir)
      .filter(f => f.startsWith('medflash-') && f.endsWith('.db'))
      .sort()
      .reverse();
    
    if (backups.length > 7) {
      backups.slice(7).forEach(file => {
        unlinkSync(join(backupDir, file));
        console.log(`🗑️ Supprimé ancien backup: ${file}`);
      });
    }
    
    return backupPath;
  } catch (error) {
    console.error('❌ Erreur backup:', error);
  }
}

// Backup quotidien
if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    backupDatabase();
  }, 24 * 60 * 60 * 1000); // 24h
  
  // Backup initial au démarrage
  setTimeout(() => backupDatabase(), 5000);
}