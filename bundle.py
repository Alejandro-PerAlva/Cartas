import os, re

files_order = [
    'iron_helm_game/js/utils/logger.js',
    'iron_helm_game/js/utils/audio.js',
    'iron_helm_game/js/data/characters.js',
    'iron_helm_game/js/data/bosses.js',
    'iron_helm_game/js/data/enemies.js',
    'iron_helm_game/js/data/equipment.js',
    'iron_helm_game/js/data/potions.js',
    'iron_helm_game/js/data/skills.js',
    'iron_helm_game/js/data/plots.js',
    'iron_helm_game/js/data/dungeonCards.js',
    'iron_helm_game/js/data/expansions.js',
    'iron_helm_game/js/engine/inventoryEngine.js',
    'iron_helm_game/js/engine/combatEngine.js',
    'iron_helm_game/js/engine/dungeonEngine.js',
    'iron_helm_game/js/engine/gameState.js',
    'iron_helm_game/js/ui/tokenPile.js',
    'iron_helm_game/js/ui/dice3D.js',
    'iron_helm_game/js/ui/configMenu.js',
    'iron_helm_game/js/ui/dungeonMatView.js',
    'iron_helm_game/js/ui/characterMatView.js',
    'iron_helm_game/js/ui/inventoryFanView.js',
    'iron_helm_game/js/ui/combatArenaView.js',
    'iron_helm_game/js/ui/cardInteractionModal.js',
    'iron_helm_game/js/ui/merchantModal.js',
    'iron_helm_game/js/ui/logPanel.js',
    'iron_helm_game/js/ui/debugConsole.js',
    'iron_helm_game/js/ui/cardModal.js',
    'iron_helm_game/js/ui/endGameModal.js',
    'iron_helm_game/js/ui/tabletopBoardView.js',
    'iron_helm_game/js/ui/app.js'
]

bundled_lines = ['// IRON HELM DIGITAL - BUNDLED STANDALONE VERSION\n(function() {\n"use strict";\n']

for fpath in files_order:
    with open(fpath, 'r', encoding='utf-8') as f:
        code = f.read()

    # Remove import lines
    code = re.sub(r'^\s*import\s+.*?;\s*$', '', code, flags=re.MULTILINE)
    # Replace 'export const X =' with 'const X ='
    code = re.sub(r'^\s*export\s+const\s+', 'const ', code, flags=re.MULTILINE)
    # Replace 'export class X' with 'class X'
    code = re.sub(r'^\s*export\s+class\s+', 'class ', code, flags=re.MULTILINE)
    # Replace 'export function X' with 'function X'
    code = re.sub(r'^\s*export\s+function\s+', 'function ', code, flags=re.MULTILINE)
    # Remove 'export default' or 'export { ... }'
    code = re.sub(r'^\s*export\s+default\s+.*?;', '', code, flags=re.MULTILINE)
    code = re.sub(r'^\s*export\s+\{.*?\};', '', code, flags=re.MULTILINE)

    bundled_lines.append(f'// --- FILE: {fpath} ---\n')
    bundled_lines.append(code)
    bundled_lines.append('\n\n')

bundled_lines.append('\n})();\n')

bundle_code = '\n'.join(bundled_lines)
with open('iron_helm_game/app.bundle.js', 'wb') as out:
    out.write(bundle_code.encode('utf-8'))

print(f'Generated iron_helm_game/app.bundle.js successfully! Size: {len(bundle_code)} bytes')
