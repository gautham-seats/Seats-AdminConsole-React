// ViewModels/StudentDelete/StudentDeleteModel.cs; id is the student GlobalId.
export type StudentDeleteRowDto = {
  id: string
  student: string | null
  confirmationDate: string | null
  confirmed: boolean | null
  autoDeleteDate: string | null
}

// ViewModels/Student/StudentModel.cs.
export type StudentRowDto = {
  id: string
  fullName: string | null
  number: string | null
  email: string | null
}

// ViewModels/StudentRecycleBin/StudentRecycleBinModel.cs.
export type StudentRecycleBinRowDto = {
  id: string
  student: string | null
  movedToRecycleBin: string | null
  deleteDate: string | null
}
