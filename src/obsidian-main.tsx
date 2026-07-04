import { ItemView, Modal, Notice, Plugin, TFile, WorkspaceLeaf, normalizePath } from 'obsidian'
import { createRoot, type Root } from 'react-dom/client'
import App from './App'
import appStyles from './App.css?raw'

const VIEW_TYPE_STELLARIS = 'stellaris-writing-view'
const PLUGIN_FOLDER = 'Stellaris Writing'
const NOTES_FOLDER = `${PLUGIN_FOLDER}/Notes`
const CANVAS_FOLDER = `${PLUGIN_FOLDER}/Whiteboards`

type PluginData = {
  snapshot: string | null
  notePaths: Record<string, string>
  canvasPaths: Record<string, string>
}

type SnapshotPiece = {
  id: string
  zodiacId: string
  starId: string
  title: string
  content: string
  target: number
  updatedAt: string
}

type SnapshotWhiteboard = {
  id: string
  title: string
  nodes?: Array<{ id: string; x: number; y: number; text: string }>
  edges?: Array<{ id: string; from: string; to: string; label: string }>
}

type AppSnapshot = {
  pieces?: Record<string, SnapshotPiece>
  whiteboards?: Record<string, SnapshotWhiteboard>
}

function safeName(value: string) {
  return (value || 'Untitled')
    .replace(/[\\/:*?"<>|#^[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90) || 'Untitled'
}

function textStats(text: string) {
  const compact = text.replace(/\s+/g, '')
  const words = text.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)?|[\u4e00-\u9fff]/g) ?? []
  return { characters: compact.length, words: words.length }
}

function markdownForSnapshotPiece(piece: SnapshotPiece) {
  const stats = textStats(piece.content)
  return [
    '---',
    `title: "${piece.title.replace(/"/g, '\\"')}"`,
    `stellarisId: "${piece.id}"`,
    `zodiac: "${piece.zodiacId}"`,
    `star: "${piece.starId}"`,
    `target: ${piece.target}`,
    `words: ${stats.words}`,
    `characters: ${stats.characters}`,
    `updatedAt: "${piece.updatedAt}"`,
    '---',
    '',
    `# ${piece.title}`,
    '',
    piece.content.trim() || '_No writing yet._',
    '',
  ].join('\n')
}

function canvasForSnapshotWhiteboard(board: SnapshotWhiteboard) {
  const nodes = (board.nodes ?? []).map((node) => ({
    id: node.id,
    type: 'text',
    x: Math.round(node.x),
    y: Math.round(node.y),
    width: 260,
    height: 120,
    text: node.text || board.title,
  }))
  const edges = (board.edges ?? []).map((edge) => ({
    id: edge.id,
    fromNode: edge.from,
    fromSide: 'right',
    toNode: edge.to,
    toSide: 'left',
    label: edge.label,
  }))

  return JSON.stringify({ nodes, edges }, null, 2)
}

class StellarisWritingView extends ItemView {
  private readonly plugin: StellarisWritingPlugin

  constructor(leaf: WorkspaceLeaf, plugin: StellarisWritingPlugin) {
    super(leaf)
    this.plugin = plugin
  }

  getViewType() {
    return VIEW_TYPE_STELLARIS
  }

  getDisplayText() {
    return 'Stellaris Writing'
  }

  getIcon() {
    return 'sparkles'
  }

  async onOpen() {
    this.containerEl.empty()
    this.plugin.openWorkspace()
  }

  async onClose() {
    // The legacy tab view only delegates to the full-screen workspace.
  }
}

class StellarisWritingModal extends Modal {
  private root: Root | null = null
  private styleEl: HTMLStyleElement | null = null
  private readonly plugin: StellarisWritingPlugin

  constructor(plugin: StellarisWritingPlugin) {
    super(plugin.app)
    this.plugin = plugin
  }

  onOpen() {
    this.plugin.installBridge()
    this.modalEl.addClass('stellaris-obsidian-modal')
    this.containerEl.addClass('stellaris-obsidian-modal-container')
    this.contentEl.empty()
    this.contentEl.addClass('stellaris-obsidian-root')
    this.contentEl.addClass('stellaris-obsidian-modal-root')

    this.containerEl.setAttr(
      'style',
      'position:fixed; inset:0; width:100vw; height:100vh; max-width:none; max-height:none; padding:0; margin:0; background:#030a10;',
    )
    this.modalEl.setAttr(
      'style',
      'position:fixed; inset:0; width:100vw; height:100vh; max-width:none; max-height:none; padding:0; margin:0; border:0; border-radius:0; background:#030a10; box-shadow:none; transform:none;',
    )
    this.contentEl.setAttr(
      'style',
      'position:absolute; inset:0; width:100%; height:100%; padding:0; margin:0; overflow:hidden; background:#030a10; color:#eadfcb;',
    )

    this.styleEl = document.createElement('style')
    this.styleEl.textContent = this.plugin.stylesForView()
    document.head.appendChild(this.styleEl)

    const mount = this.contentEl.createDiv({ cls: 'stellaris-react-mount' })
    const closeButton = this.contentEl.createEl('button', {
      cls: 'stellaris-modal-close',
      text: '×',
      attr: { 'aria-label': 'Close Stellaris Writing' },
    })
    closeButton.addEventListener('click', () => this.close())

    this.root = createRoot(mount)
    this.root.render(<App />)
  }

  onClose() {
    this.root?.unmount()
    this.root = null
    this.styleEl?.remove()
    this.styleEl = null
    this.contentEl.empty()
  }
}

export default class StellarisWritingPlugin extends Plugin {
  private data: PluginData = { snapshot: null, notePaths: {}, canvasPaths: {} }

  async onload() {
    this.data = {
      snapshot: null,
      notePaths: {},
      canvasPaths: {},
      ...(await this.loadData()),
    }
    this.installBridge()
    this.registerView(
      VIEW_TYPE_STELLARIS,
      (leaf) => new StellarisWritingView(leaf, this),
    )
    this.addRibbonIcon('sparkles', 'Open Stellaris Writing', () => this.openWorkspace())
    this.addCommand({
      id: 'open-stellaris-writing',
      name: 'Open Stellaris Writing',
      callback: () => this.openWorkspace(),
    })
    this.app.workspace.onLayoutReady(() => {
      this.app.workspace.detachLeavesOfType(VIEW_TYPE_STELLARIS)
    })
  }

  onunload() {
    if (window.StellarisObsidianBridge) {
      delete window.StellarisObsidianBridge
    }
  }

  installBridge() {
    window.StellarisObsidianBridge = {
      loadSnapshot: async () => this.data.snapshot,
      saveSnapshot: async (contents) => {
        this.data.snapshot = contents
        await this.saveData(this.data)
        await this.syncSnapshotFiles(contents)
        return `${PLUGIN_FOLDER}/`
      },
      exportMigrationFile: async (contents) => {
        const path = `${PLUGIN_FOLDER}/stellaris-migration-${Date.now()}.json`
        await this.writeFile(path, contents)
        new Notice(`Stellaris migration exported: ${path}`)
        return path
      },
      saveMarkdownFile: async ({ filename, contents }) => {
        const path = `${NOTES_FOLDER}/${safeName(filename).replace(/\.md$/i, '')}.md`
        await this.writeFile(path, contents)
        const file = this.app.vault.getAbstractFileByPath(path)
        if (file instanceof TFile) {
          await this.app.workspace.getLeaf(false).openFile(file)
        }
        new Notice(`Saved note: ${path}`)
        return path
      },
      savePdfFile: async ({ filename, contentsBase64 }) => {
        const path = `${PLUGIN_FOLDER}/Exports/${safeName(filename).replace(/\.pdf$/i, '')}.pdf`
        const bytes = Uint8Array.from(atob(contentsBase64), (character) => character.charCodeAt(0))
        await this.writeBinaryFile(path, bytes.buffer)
        const file = this.app.vault.getAbstractFileByPath(path)
        if (file instanceof TFile) {
          await this.app.workspace.getLeaf(false).openFile(file)
        }
        new Notice(`Saved PDF: ${path}`)
        return path
      },
      openCanvasFile: async ({ id, title, contents }) => {
        const path = await this.upsertMappedFile(
          'canvasPaths',
          id,
          `${CANVAS_FOLDER}/${safeName(title)} - ${id}.canvas`,
          contents,
        )
        const file = this.app.vault.getAbstractFileByPath(path)
        if (file instanceof TFile) {
          await this.app.workspace.getLeaf(false).openFile(file)
        }
        return path
      },
    }
  }

  stylesForView() {
    const pluginDirectory = this.manifest.dir

    if (!pluginDirectory) {
      return appStyles
    }

    return appStyles.replace(/url\('assets\/([^']+)'\)/g, (_match, assetName: string) => {
      const path = normalizePath(`${pluginDirectory}/assets/${assetName}`)
      return `url('${this.app.vault.adapter.getResourcePath(path)}')`
    })
  }

  openWorkspace() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_STELLARIS)
    new StellarisWritingModal(this).open()
  }

  private async ensureFolder(path: string) {
    const normalized = normalizePath(path)
    if (!this.app.vault.getAbstractFileByPath(normalized)) {
      await this.app.vault.createFolder(normalized)
    }
  }

  private async writeFile(path: string, contents: string) {
    const normalized = normalizePath(path)
    const folder = normalized.split('/').slice(0, -1).join('/')
    if (folder) {
      await this.ensureFolder(folder)
    }

    const existing = this.app.vault.getAbstractFileByPath(normalized)
    if (existing instanceof TFile) {
      await this.app.vault.modify(existing, contents)
    } else {
      await this.app.vault.create(normalized, contents)
    }
    return normalized
  }

  private async writeBinaryFile(path: string, contents: ArrayBuffer) {
    const normalized = normalizePath(path)
    const folder = normalized.split('/').slice(0, -1).join('/')
    if (folder) {
      await this.ensureFolder(folder)
    }

    const existing = this.app.vault.getAbstractFileByPath(normalized)
    if (existing instanceof TFile) {
      await this.app.vault.modifyBinary(existing, contents)
    } else {
      await this.app.vault.createBinary(normalized, contents)
    }
    return normalized
  }

  private async upsertMappedFile(
    mapName: 'notePaths' | 'canvasPaths',
    id: string,
    desiredPath: string,
    contents: string,
  ) {
    const currentPath = this.data[mapName][id]
    const normalizedDesired = normalizePath(desiredPath)

    if (currentPath && currentPath !== normalizedDesired) {
      const currentFile = this.app.vault.getAbstractFileByPath(currentPath)
      if (currentFile instanceof TFile && !this.app.vault.getAbstractFileByPath(normalizedDesired)) {
        const folder = normalizedDesired.split('/').slice(0, -1).join('/')
        if (folder) {
          await this.ensureFolder(folder)
        }
        await this.app.fileManager.renameFile(currentFile, normalizedDesired)
      }
    }

    const path = await this.writeFile(normalizedDesired, contents)
    this.data[mapName][id] = path
    await this.saveData(this.data)
    return path
  }

  private async syncSnapshotFiles(contents: string) {
    let snapshot: AppSnapshot | null = null
    try {
      snapshot = JSON.parse(contents) as AppSnapshot
    } catch {
      return
    }

    for (const piece of Object.values(snapshot.pieces ?? {})) {
      const hasContent = piece.content.trim().length > 0
      const hasCustomTitle = piece.title.trim() && piece.title !== 'Untitled'
      if (!hasContent && !hasCustomTitle) continue

      await this.upsertMappedFile(
        'notePaths',
        piece.id,
        `${NOTES_FOLDER}/${safeName(piece.title)} - ${piece.id}.md`,
        markdownForSnapshotPiece(piece),
      )
    }

    for (const board of Object.values(snapshot.whiteboards ?? {})) {
      await this.upsertMappedFile(
        'canvasPaths',
        board.id,
        `${CANVAS_FOLDER}/${safeName(board.title)} - ${board.id}.canvas`,
        canvasForSnapshotWhiteboard(board),
      )
    }
  }
}
