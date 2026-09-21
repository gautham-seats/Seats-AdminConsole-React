// Keys verified in Seats.Trunk.Resources/GeneralResources.resx.
export const SharedResourceKeys = {
  loading: 'Loading',
  refresh: 'Refresh',
  generalError: 'AlertGeneralErrorDefault',
  cancel: 'Cancel',
  close: 'Close',
  confirm: 'Confirm',
  delete: 'Delete',
  deleteConfirmation: 'DeleteConfirmationMsg',
  noRecords: 'NoRecordsWereFound',
  more: 'More',
} as const

export const SHARED_RESOURCE_KEYS: readonly string[] = Object.values(SharedResourceKeys)
