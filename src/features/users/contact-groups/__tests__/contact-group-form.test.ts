import {
  addMember,
  entityRequired,
  isKnockoutEmail,
  isValidEmail,
  parseContactGroupView,
  sendOptionDisabled,
  toContactGroupForm,
  toContactGroupPayload,
  upsertFunction,
  validateContactGroup,
  withEntity,
  withFunction,
  withGroupEmail,
} from '../contact-group-form'

const view = parseContactGroupView({
  detail: {
    id: 11,
    name: 'Registry',
    description: 'Front office',
    groupEmailAddress: 'registry@example.com',
    sendEmailsToTypeId: 1,
    functionId: 4,
    functionName: null,
    entityId: 5,
    schoolId: 30,
    associatedToDescription: 'School of Law',
    userIdsInContactGroup: [7],
  },
  users: [{ id: 7, userName: 'maya.lee', fullName: 'Maya Lee', emailAddress: 'maya@example.com' }],
  sendEmailToAvailables: [
    { id: 1, description: 'Group email', visible: false },
    { id: 2, description: 'Members', visible: false },
    { id: 3, description: 'Both', visible: false },
  ],
  entityAvailables: [
    { id: 0, description: 'None' },
    { id: 5, description: 'School' },
  ],
  functionAvailables: [
    { id: 4, name: 'Attendance' },
    { id: 6, name: 'Exams' },
  ],
})

describe('contact group form', () => {
  it('loads the association and fills the missing function name from the list', () => {
    const form = toContactGroupForm(view)
    expect(form).toMatchObject({
      functionName: 'Attendance',
      entityId: 5,
      entityValueId: 30,
      members: [{ id: 7 }],
    })
  })

  it('disables send-to options without a valid email or members, counting every loaded member until edited', () => {
    const form = toContactGroupForm(view)
    const [group, members, both] = view.sendEmailToAvailables
    expect([group, members, both].map(option => sendOptionDisabled(option, form))).toEqual([
      false,
      false,
      false,
    ])
    const noEmail = {
      ...form,
      groupEmailAddress: 'not-an-email',
      members: [{ ...form.members[0], emailAddress: null }],
    }
    expect([group, members, both].map(option => sendOptionDisabled(option, noEmail))).toEqual([
      true,
      false,
      true,
    ])
    const edited = { ...noEmail, countAllMembers: false }
    expect([group, members, both].map(option => sendOptionDisabled(option, edited))).toEqual([
      true,
      true,
      true,
    ])
    expect(withGroupEmail(form, 'x').countAllMembers).toBe(false)
  })

  it('judges the group address with the knockout email rule and members with the controller regex', () => {
    const form = { ...toContactGroupForm(view), groupEmailAddress: 'desk@example.c' }
    expect(isKnockoutEmail('')).toBe(true)
    expect(isKnockoutEmail('desk@example.c')).toBe(true)
    expect(isValidEmail('desk@example.c')).toBe(false)
    const [group] = view.sendEmailToAvailables
    expect(sendOptionDisabled(group, form)).toBe(false)
    expect(sendOptionDisabled(group, { ...form, groupEmailAddress: '' })).toBe(true)
    expect(sendOptionDisabled(group, { ...form, groupEmailAddress: 'desk@[10.0.0.1]' })).toBe(true)
  })

  it('clears the association when the function or entity changes', () => {
    const form = toContactGroupForm(view)
    expect(withFunction(form, view.functionAvailables, 6)).toMatchObject({
      functionId: 6,
      functionName: 'Exams',
      entityId: null,
      entityValueId: null,
      associatedToDescription: '',
    })
    expect(withEntity(form, 1)).toMatchObject({
      entityId: 1,
      entityValueId: null,
      associatedToDescription: '',
    })
  })

  it('requires name, send-to and the chosen entity, and blocks angle brackets', () => {
    const empty = {
      ...toContactGroupForm(view),
      name: '',
      sendEmailsToTypeId: null,
      entityValueId: null,
      description: '<b>',
    }
    expect(validateContactGroup(empty)).toEqual({
      name: 'required',
      sendEmailsToTypeId: 'required',
      entity: 'required',
      description: 'specialCharacters',
    })
    expect(entityRequired(empty)).toBe(true)
    expect(entityRequired({ ...empty, entityId: null })).toBe(false)
    expect(validateContactGroup({ ...toContactGroupForm(view), functionName: 'A>B' })).toEqual({
      functionName: 'specialCharacters',
    })
    expect(validateContactGroup(empty, false)).toEqual({
      name: 'required',
      sendEmailsToTypeId: 'required',
      entity: 'required',
    })
  })

  it('needs members or a group email and adds a member only once', () => {
    const form = toContactGroupForm(view)
    expect(addMember(form, form.members[0]).members).toHaveLength(1)
  })

  it('posts only the id field of the chosen entity plus the member ids', () => {
    const form = { ...toContactGroupForm(view), name: 'Registry Office' }
    expect(toContactGroupPayload(form, view.detail)).toMatchObject({
      id: 11,
      name: 'Registry Office',
      functionId: 4,
      functionName: 'Attendance',
      entityId: 5,
      schoolId: 30,
      courseId: null,
      facultyId: null,
      userIdsInContactGroup: [7],
    })
    expect(upsertFunction(view.functionAvailables, { id: 6, name: 'Exam Board' })[1]).toEqual({
      id: 6,
      name: 'Exam Board',
    })
  })
})
