import zipfile
import os
import re
import io
from PIL import Image

ZIP_PATH = '17. Iron Helm (1).zip'
GAME_CARDS_DIR = os.path.join('iron_helm_game', 'assets', 'cards', 'expansions')

# Mapping of all expansions
EXPANSIONS = {
    '01. Warren of Despair/01. Warren of Despair.pdf': 'warren',
    '02. Blackened Burrow/02. Blackened Burrow.pdf': 'blackened',
    '03. Galnok\'s Labyrinth/03. Galnok\'s Labyrinth.pdf': 'galnok',
    '04. Crystal Caverns/04. Crystal Caverns.pdf': 'crystal',
    '05. Throne of Embers/05. Throne of Embers.pdf': 'throne',
    '06. Malicia\'s Refuge/06. Malicia\'s Refuge.pdf': 'malicia',
    '07. The Spire of Zogar/07. The Spire of Zogar.pdf': 'spire',
    '08. Loot & Lore/08. Loot & Lore.pdf': 'loot_lore',
    '09. Realms & Relics/09. Realms & Relics.pdf': 'realms',
    '10. The Lonely Troll Inn/10. The Lonely Troll Inn.pdf': 'troll',
    '11. The Fanny Pack/11. The Fanny Pack.pdf': 'fanny_pack',
    '12. Beasts & Burdens/12. Beasts & Burdens.pdf': 'beasts',
    '13. The Howling Abyss/13. The Howling Abyss.pdf': 'howling',
    '14. Iron Chest/14. Iron Chest.pdf': 'iron_chest',
    '15. Gnome Pack #1 + Promo Underquest/Gnome Pack #1.pdf': 'gnome',
    '../03. Expansión Fanmade -Anemia-/02. Cartas/Anemia 4.0.pdf': 'anemia'
}

def extract_web_cards():
    print("=== Extrayendo y optimizando gráficos de cartas para la web ===")
    pattern = re.compile(rb'/Filter\s*/DCTDecode.*?stream[\r\n]+(.*?)[\r\n]+endstream', re.DOTALL)
    
    with zipfile.ZipFile(ZIP_PATH, 'r') as z:
        for rel_pdf, slug in EXPANSIONS.items():
            target_dir = os.path.join(GAME_CARDS_DIR, slug)
            os.makedirs(target_dir, exist_ok=True)
            
            existing = [f for f in os.listdir(target_dir) if f.startswith('card_') and f.endswith('.jpg')]
            if len(existing) >= 30:
                print(f"[{slug}] Ya cuenta con {len(existing)} cartas extraídas. Omitiendo.")
                continue
                
            full_pdf = '17. Iron Helm/02. Expansiones/' + rel_pdf
            full_pdf = full_pdf.replace('\\\\', '/').replace('\\', '/')
            if not any(f.filename == full_pdf for f in z.infolist()):
                print(f"Error: {full_pdf} no existe en el zip")
                continue
                
            print(f"[{slug}] Extrayendo cartas desde {full_pdf}...")
            with z.open(full_pdf) as f:
                data = f.read()
                matches = pattern.findall(data)
                print(f"[{slug}] Encontradas {len(matches)} imágenes.")
                for i, m in enumerate(matches):
                    try:
                        im = Image.open(io.BytesIO(m))
                        # Si la imagen viene en horizontal y debería ser vertical, o redimensionar a (480, 675)
                        if im.width > im.height:
                            # Algunas hojas o mapas vienen apaisados
                            im_resized = im.resize((675, 480), Image.Resampling.LANCZOS)
                        else:
                            im_resized = im.resize((480, 675), Image.Resampling.LANCZOS)
                        out_path = os.path.join(target_dir, f'card_{i:03d}.jpg')
                        im_resized.save(out_path, format='JPEG', quality=85, optimize=True)
                    except Exception as e:
                        print(f"Error procesando imagen {i} de {slug}: {e}")
            print(f"[{slug}] OK -> {target_dir}")

def extract_full_zip():
    print("\n=== Descomprimiendo el contenido completo del zip (17. Iron Helm) ===")
    target_dir = '.'
    with zipfile.ZipFile(ZIP_PATH, 'r') as z:
        total = len(z.infolist())
        for idx, item in enumerate(z.infolist()):
            out_path = os.path.join(target_dir, item.filename)
            if os.path.exists(out_path) and os.path.getsize(out_path) == item.file_size:
                print(f"[{idx+1}/{total}] Ya extraído: {item.filename}")
                continue
            print(f"[{idx+1}/{total}] Extrayendo ({item.file_size / (1024*1024):.1f} MB): {item.filename}...")
            z.extract(item, target_dir)
    print("=== Descompresión completa exitosa ===")

if __name__ == '__main__':
    extract_web_cards()
    extract_full_zip()
