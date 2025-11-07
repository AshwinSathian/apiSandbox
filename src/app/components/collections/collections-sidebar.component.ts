import { CommonModule } from "@angular/common";
import {
  Component,
  OnInit,
  computed,
  signal,
  WritableSignal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import {
  ConfirmationService,
  MenuItem,
  TreeNode,
  TreeDragDropService,
} from "primeng/api";
import { ButtonModule } from "primeng/button";
import { ContextMenuModule } from "primeng/contextmenu";
import { InputTextModule } from "primeng/inputtext";
import { SkeletonModule } from "primeng/skeleton";
import { TreeModule } from "primeng/tree";
import { DialogModule } from "primeng/dialog";
import { SelectModule } from "primeng/select";
import { ConfirmDialogModule } from "primeng/confirmdialog";
import {
  Collection,
  CollectionExport,
  Folder,
  RequestDoc,
} from "../../models/collections.models";
import {
  CollectionTree,
  CollectionsService,
} from "../../services/collections.service";
import {
  serializeDeterministic,
  parseCollectionImport,
  ValidationResult,
} from "../../shared/collections/collection-io.util";
import { PastRequest } from "../../models/history.models";

type NodeType = "collection" | "folder" | "request";

interface NodeData {
  type: NodeType;
  ref: Collection | Folder | RequestDoc;
}

interface TreeDragDropEvent {
  dragNode?: TreeNode<NodeData>;
  tree?: { value?: TreeNode<NodeData>[] };
}

@Component({
  selector: "app-collections-sidebar",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TreeModule,
    ContextMenuModule,
    ButtonModule,
    InputTextModule,
    SkeletonModule,
    DialogModule,
    SelectModule,
    ConfirmDialogModule,
  ],
  templateUrl: "./collections-sidebar.component.html",
  styleUrls: ["./collections-sidebar.component.css"],
  providers: [ConfirmationService, TreeDragDropService],
})
export class CollectionsSidebarComponent implements OnInit {
  readonly nodes = computed<TreeNode<NodeData>[]>(() =>
    this.collectionsToNodes(this.collectionsService.tree())
  );
  readonly loading = this.collectionsService.loading;
  readonly selectedNode = signal<TreeNode<NodeData> | null>(null);
  readonly contextItems = signal<MenuItem[]>([]);
  readonly editingKey: WritableSignal<string | null> = signal(null);
  editingValue = "";
  importDialogVisible = false;
  importErrors: ValidationResult[] = [];
  pendingImport: CollectionExport | null = null;
  importFileName = "";
  creationDialogVisible = false;
  creationContext:
    | {
        type: "collection" | "folder" | "request";
        collectionId?: string;
        folderId?: string;
      }
    | null = null;
  creationModel = {
    name: "",
    method: "GET" as PastRequest["method"],
  };
  readonly methodOptions = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "HEAD",
    "OPTIONS",
  ].map((method) => ({ label: method, value: method as PastRequest["method"] }));

  constructor(
    private readonly collectionsService: CollectionsService,
    private readonly confirmationService: ConfirmationService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.collectionsService.ensureLoaded();
  }

  async handleCreateCollection(): Promise<void> {
    this.openCreationDialog({ type: "collection" });
  }

  async handleImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const text = await file.text();
    const result = parseCollectionImport(text);
    if (result.errors?.length) {
      this.importErrors = result.errors;
      this.pendingImport = null;
    } else {
      this.pendingImport = result.payload ?? null;
      this.importErrors = [];
    }
    this.importFileName = file.name;
    this.importDialogVisible = true;
    input.value = "";
  }

  async confirmImport(): Promise<void> {
    if (!this.pendingImport) {
      this.importDialogVisible = false;
      return;
    }
    const payload = this.pendingImport;
    const target = await this.collectionsService.createCollection({
      name: `${payload.collection.name} (Imported)`,
      description: payload.collection.description,
    });
    const folderIdMap = new Map<string, string>();
    const folders = this.sortByOrder(payload.folders);
    for (const folder of folders) {
      const created = await this.collectionsService.createFolder({
        collectionId: target.meta.id,
        name: folder.name,
        parentFolderId: folder.parentFolderId
          ? folderIdMap.get(folder.parentFolderId)
          : undefined,
      });
      folderIdMap.set(folder.meta.id, created.meta.id);
    }

    const requests = this.sortByOrder(payload.requests);
    for (const request of requests) {
      await this.collectionsService.createRequest({
        collectionId: target.meta.id,
        folderId: request.folderId ? folderIdMap.get(request.folderId) : undefined,
        name: request.name,
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.body,
      });
    }
    this.closeImportDialog();
  }

  closeImportDialog(): void {
    this.importDialogVisible = false;
    this.importErrors = [];
    this.pendingImport = null;
    this.importFileName = "";
  }

  handleNodeSelect(node: TreeNode<NodeData>): void {
    this.selectedNode.set(node);
    this.contextItems.set(this.buildContextItems(node));
  }

  async handleDrop(event: TreeDragDropEvent): Promise<void> {
    const dragData = event.dragNode?.data as NodeData | undefined;
    if (!dragData) {
      return;
    }
    if (dragData.type === "collection") {
      const order = (event.tree?.value ?? this.nodes()).map((n, index) => ({
        id: (n.data as NodeData).ref.meta.id,
        order: index + 1,
      }));
      await this.collectionsService.reorderCollections(order);
      return;
    }

    if (dragData.type === "folder") {
      const siblings = event.dragNode.parent?.children ?? [];
      const order = siblings.map((n, index) => ({
        id: (n.data as NodeData).ref.meta.id,
        order: index + 1,
      }));
      await this.collectionsService.reorderFolders(order);
      return;
    }

    if (dragData.type === "request") {
      const siblings = event.dragNode.parent?.children ?? [];
      const order = siblings.map((n, index) => ({
        id: (n.data as NodeData).ref.meta.id,
        order: index + 1,
      }));
      await this.collectionsService.reorderRequests(order);
    }
  }

  beginRename(node: TreeNode<NodeData>): void {
    this.editingKey.set(node.key ?? null);
    this.editingValue = node.label ?? "";
  }

  async commitRename(node: TreeNode<NodeData>): Promise<void> {
    const key = node.key;
    if (!key) {
      return;
    }
    const value = this.editingValue.trim();
    if (!value) {
      return;
    }
    const data = node.data as NodeData;
    if (data.type === "collection") {
      await this.collectionsService.renameCollection(data.ref.meta.id, {
        name: value,
      });
    } else if (data.type === "folder") {
      await this.collectionsService.renameFolder(data.ref.meta.id, value);
    } else if (data.type === "request") {
      await this.collectionsService.renameRequest(data.ref.meta.id, value);
    }
    this.cancelEdit();
  }

  cancelEdit(): void {
    this.editingKey.set(null);
    this.editingValue = "";
  }

  async handleAction(action: string, node: TreeNode<NodeData>): Promise<void> {
    const data = node.data as NodeData;
    switch (action) {
      case "new-folder":
        if (data.type === "collection" && this.isCollection(data.ref)) {
          await this.createFolderPrompt(data.ref.meta.id);
        }
        break;
      case "new-request":
        if (data.type === "collection" && this.isCollection(data.ref)) {
          await this.createRequestPrompt(data.ref.meta.id);
        } else if (data.type === "folder" && this.isFolder(data.ref)) {
          await this.createRequestPrompt(data.ref.collectionId, data.ref.meta.id);
        }
        break;
      case "duplicate":
        await this.duplicateNode(data);
        break;
      case "delete":
        await this.deleteNode(data);
        break;
      case "rename":
        this.beginRename(node);
        break;
    }
  }

  private async createFolderPrompt(collectionId: string): Promise<void> {
    this.openCreationDialog({ type: "folder", collectionId });
  }

  private async createRequestPrompt(
    collectionId: string,
    folderId?: string
  ): Promise<void> {
    this.openCreationDialog({ type: "request", collectionId, folderId });
  }

  private async duplicateNode(data: NodeData): Promise<void> {
    if (data.type === "collection") {
      await this.collectionsService.duplicateCollection(data.ref.meta.id);
    } else if (data.type === "folder") {
      await this.collectionsService.duplicateFolder(data.ref.meta.id);
    } else {
      await this.collectionsService.duplicateRequest(data.ref.meta.id);
    }
  }

  private async deleteNode(data: NodeData): Promise<void> {
    this.confirmationService.confirm({
      message: "This action cannot be undone. Continue?",
      header: "Delete item?",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Delete",
      rejectLabel: "Cancel",
      acceptButtonStyleClass: "p-button-danger",
      accept: async () => {
        if (data.type === "collection") {
          await this.collectionsService.deleteCollection(data.ref.meta.id);
        } else if (data.type === "folder") {
          await this.collectionsService.deleteFolder(data.ref.meta.id);
        } else {
          await this.collectionsService.deleteRequest(data.ref.meta.id);
        }
      },
    });
  }

  private buildContextItems(node: TreeNode<NodeData>): MenuItem[] {
    const data = node.data as NodeData;
    if (data.type === "collection") {
      return [
        {
          label: "New Folder",
          icon: "pi pi-folder",
          command: () => this.handleAction("new-folder", node),
        },
        {
          label: "New Request",
          icon: "pi pi-plus",
          command: () => this.handleAction("new-request", node),
        },
        { separator: true },
        {
          label: "Rename",
          icon: "pi pi-pencil",
          command: () => this.handleAction("rename", node),
        },
        {
          label: "Duplicate",
          icon: "pi pi-copy",
          command: () => this.handleAction("duplicate", node),
        },
        {
          label: "Export",
          icon: "pi pi-download",
          command: () => this.exportCollection(node),
        },
        {
          label: "Delete",
          icon: "pi pi-trash",
          command: () => this.handleAction("delete", node),
        },
      ];
    }
    if (data.type === "folder") {
      return [
        {
          label: "New Request",
          icon: "pi pi-plus",
          command: () => this.handleAction("new-request", node),
        },
        {
          label: "Rename",
          icon: "pi pi-pencil",
          command: () => this.handleAction("rename", node),
        },
        {
          label: "Duplicate",
          icon: "pi pi-copy",
          command: () => this.handleAction("duplicate", node),
        },
        {
          label: "Delete",
          icon: "pi pi-trash",
          command: () => this.handleAction("delete", node),
        },
      ];
    }
    return [
      {
        label: "Rename",
        icon: "pi pi-pencil",
        command: () => this.handleAction("rename", node),
      },
      {
        label: "Duplicate",
        icon: "pi pi-copy",
        command: () => this.handleAction("duplicate", node),
      },
      {
        label: "Delete",
        icon: "pi pi-trash",
        command: () => this.handleAction("delete", node),
      },
    ];
  }

  private collectionsToNodes(trees: CollectionTree[]): TreeNode<NodeData>[] {
    return trees.map((entry) => this.toCollectionNode(entry));
  }

  private toCollectionNode(entry: CollectionTree): TreeNode<NodeData> {
    return {
      key: `collection:${entry.collection.meta.id}`,
      label: entry.collection.name,
      data: { type: "collection", ref: entry.collection },
      expanded: true,
      children: [
        ...entry.folders.map((folder) => this.toFolderNode(folder, entry)),
        ...entry.requests
          .filter((req) => !req.folderId)
          .map((req) => this.toRequestNode(req)),
      ],
    };
  }

  private toFolderNode(folder: Folder, entry: CollectionTree): TreeNode<NodeData> {
    const children = entry.requests
      .filter((req) => req.folderId === folder.meta.id)
      .map((req) => this.toRequestNode(req));
    return {
      key: `folder:${folder.meta.id}`,
      label: folder.name,
      data: { type: "folder", ref: folder },
      children,
    };
  }

  private toRequestNode(req: RequestDoc): TreeNode<NodeData> {
    return {
      key: `request:${req.meta.id}`,
      label: req.name || req.url || req.method,
      data: { type: "request", ref: req },
      leaf: true,
    };
  }

  private exportCollection(node: TreeNode<NodeData>): void {
    const data = node.data as NodeData;
    if (data.type !== "collection") {
      return;
    }
    const tree = this.collectionsService.getCollectionTree(data.ref.meta.id);
    if (!tree) {
      return;
    }
    const json = serializeDeterministic(tree);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${tree.collection.name.replace(/\s+/g, "-").toLowerCase()}-collection.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private sortByOrder<T extends { order?: number; meta?: { id: string } }>(
    items: T[]
  ): T[] {
    return [...items].sort((a, b) => {
      const orderA = typeof a.order === "number" ? a.order : 0;
      const orderB = typeof b.order === "number" ? b.order : 0;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      const idA = a.meta?.id ?? "";
      const idB = b.meta?.id ?? "";
      return idA.localeCompare(idB);
    });
  }

  private isCollection(ref: Collection | Folder | RequestDoc): ref is Collection {
    return !("collectionId" in ref) && !("method" in ref);
  }

  private isFolder(ref: Collection | Folder | RequestDoc): ref is Folder {
    return "collectionId" in ref && !("method" in ref);
  }

  private isRequest(ref: Collection | Folder | RequestDoc): ref is RequestDoc {
    return "method" in ref;
  }

  get creationTitle(): string {
    switch (this.creationContext?.type) {
      case "collection":
        return "New Collection";
      case "folder":
        return "New Folder";
      case "request":
        return "New Request";
      default:
        return "New Item";
    }
  }

  get creationDisabled(): boolean {
    if (!this.creationContext) {
      return true;
    }
    if (!this.creationModel.name.trim()) {
      return true;
    }
    if (this.creationContext.type === "request" && !this.creationModel.method) {
      return true;
    }
    return false;
  }

  private openCreationDialog(context: {
    type: "collection" | "folder" | "request";
    collectionId?: string;
    folderId?: string;
  }): void {
    this.creationContext = context;
    this.creationModel = { name: "", method: "GET" };
    this.creationDialogVisible = true;
  }

  async submitCreation(): Promise<void> {
    if (!this.creationContext) {
      return;
    }
    const name = this.creationModel.name.trim();
    if (!name) {
      return;
    }

    if (this.creationContext.type === "collection") {
      await this.collectionsService.createCollection({ name });
    } else if (this.creationContext.type === "folder" && this.creationContext.collectionId) {
      await this.collectionsService.createFolder({
        collectionId: this.creationContext.collectionId,
        name,
      });
    } else if (this.creationContext.type === "request" && this.creationContext.collectionId) {
      await this.collectionsService.createRequest({
        collectionId: this.creationContext.collectionId,
        folderId: this.creationContext.folderId,
        name,
        method: this.creationModel.method,
        url: "",
      });
    }

    this.closeCreationDialog();
  }

  closeCreationDialog(): void {
    this.creationDialogVisible = false;
    this.creationContext = null;
    this.creationModel = { name: "", method: "GET" };
  }
}
