import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { firebaseStorage } from './config'

export async function uploadFile(file: File, path: string) {
  const storageRef = ref(firebaseStorage, path)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

export async function deleteFile(path: string) {
  const storageRef = ref(firebaseStorage, path)
  await deleteObject(storageRef)
}

export async function getFileURL(path: string) {
  const storageRef = ref(firebaseStorage, path)
  return getDownloadURL(storageRef)
}
