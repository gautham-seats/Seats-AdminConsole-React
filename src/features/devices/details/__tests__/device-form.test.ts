import {
  addRoom,
  auditPath,
  parseDeviceDetails,
  parseDeviceIdParam,
  removeRooms,
  toForm,
  toSaveBody,
  validateForm,
} from '../device-form'

const room = (id: number) => ({
  id,
  name: `Room ${id}`,
  description: null,
  externalCode: `R${id}`,
  capacity: 20,
})

const rawView = {
  detail: {
    id: 7,
    description: 'Reader 7',
    serialNumber: 'SN-7',
    macAddress: null,
    ipAddress: '10.0.0.7',
    assetTag: null,
    isBeacon: false,
    isActive: true,
    isZoned: false,
    deviceTypeId: 2,
    roomIdsInDevice: null,
    roomInDevices: [{ roomId: 1 }],
  },
  rooms: [room(1), { bad: true }],
  distancesAvailables: [{ id: 2, description: '2' }],
}

describe('device form', () => {
  it('parses route ids', () => {
    expect(parseDeviceIdParam('new')).toBeNull()
    expect(parseDeviceIdParam('12')).toBe(12)
    // DeviceApiController.cs:121 treats id 0 as a new device.
    expect(parseDeviceIdParam('0')).toBeNull()
    expect(parseDeviceIdParam('abc')).toBe('invalid')
    expect(parseDeviceIdParam('00')).toBe('invalid')
    expect(parseDeviceIdParam('')).toBe('invalid')
  })

  it('keeps an untouched null but posts "" for a field the user cleared', () => {
    const view = parseDeviceDetails({ ...rawView, detail: { ...rawView.detail, macAddress: null } })
    const form = toForm(view)
    expect(toSaveBody(view.detail, form, 'u').macAddress).toBeNull()
    expect(toSaveBody(view.detail, form, 'u', new Set(['macAddress'] as const)).macAddress).toBe('')
  })

  it('parses the view and keeps unknown detail fields', () => {
    const view = parseDeviceDetails(rawView)
    expect(view.rooms).toEqual([room(1)])
    expect(view.detail.extra).toEqual({ isZoned: false, deviceTypeId: 2, roomInDevices: [{ roomId: 1 }] })
    expect(() => parseDeviceDetails({ detail: {} })).toThrow()
  })

  it('requires the serial number and blocks < and > like swapp', () => {
    const form = toForm(parseDeviceDetails(rawView))
    expect(validateForm(form)).toEqual({})
    expect(validateForm({ ...form, serialNumber: '   ', description: 'a<b', assetTag: 'x>' })).toEqual({
      serialNumber: 'required',
      description: 'specialCharacters',
      assetTag: 'specialCharacters',
    })
  })

  it('adds a room once and removes selected rooms', () => {
    const rooms = addRoom(addRoom([room(1)], room(2)), room(2))
    expect(rooms.map(item => item.id)).toEqual([1, 2])
    expect(removeRooms(rooms, new Set([1])).map(item => item.id)).toEqual([2])
  })

  it('builds the legacy save body', () => {
    const view = parseDeviceDetails(rawView)
    const form = { ...toForm(view), description: 'Reader seven', isBeacon: true, rooms: [room(1), room(4)] }
    expect(toSaveBody(view.detail, form, 'https://host/x')).toEqual({
      isZoned: false,
      deviceTypeId: 2,
      roomInDevices: [{ roomId: 1 }],
      id: 7,
      description: 'Reader seven',
      serialNumber: 'SN-7',
      macAddress: null,
      ipAddress: '10.0.0.7',
      assetTag: null,
      isBeacon: true,
      isActive: true,
      roomIdsInDevice: [1, 4],
      url: 'https://host/x',
    })
    expect(auditPath(0)).toBe('#/Device/Details')
    expect(auditPath(7)).toBe('#/Device/Details/7')
  })
})
