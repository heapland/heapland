export interface FileItem {
  name: string;
  lastModified: number;
  size: number;
  isDirectory: boolean;
  extension?: string;
}

export interface FileListing {
  hasMore: boolean;
  files: FileItem[];
  fsName: string;
  provider: string;
  marker?: string;
}

export interface FailedFileListing {
  name: string;
  provider: string;
  error: string;
}

export interface FileSummary {
  owner: string;
  size: number;
  fileType: string;
  lastModified: number;
  objectUrl: string;
  etag?: string;
}

export interface FileBrowserProps {
  orgSlugId: string;
  workspaceId: number;
  connectionId: number;
  storageService: string;
  editMode: boolean;
  fileListLoading: boolean;
  name: string;
  cwd: string[];
  items: FileItem[];
  closeEditDrawer: () => void;
  showEditDrawer: () => void;
  showInfoDrawer: (path: string) => void;
  createDirectory: () => void;
  updateCWD: (cwd: string[]) => void;
  err?: string;
}
