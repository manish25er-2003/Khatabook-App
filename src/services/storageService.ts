import { deleteFile, getFileURL, uploadFile } from '../firebase/storage'

export const storageService = {
  uploadFile,
  deleteFile,
  getFileURL,
}
