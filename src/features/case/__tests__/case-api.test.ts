import { api } from '@/shared/api'
import type { CfcWorkflowStageRuleGroupDto } from '@/types/case'
import { createStageRuleGroup, updateStageRuleGroup, validateDeleteStepAction } from '../case-api'

jest.mock('@/shared/api', () => {
  const actual = jest.requireActual('@/shared/api')
  return { ...actual, api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }
})

const post = jest.mocked(api.post)
const put = jest.mocked(api.put)

const GROUP: CfcWorkflowStageRuleGroupDto = {
  id: 4,
  name: 'Renamed group',
  description: 'A group',
  sortOrder: 2,
  isSuccess: true,
  cfcWorkflowStageId: 9,
  mustPassAllRules: false,
  cfcWorkflowStageRuleGroupConstraints: [],
  cfcWorkflowStageRules: [{ id: 41 }] as CfcWorkflowStageRuleGroupDto['cfcWorkflowStageRules'],
  cfcWorkflowStageRuleGroupTriggers: [
    { id: 77 },
  ] as CfcWorkflowStageRuleGroupDto['cfcWorkflowStageRuleGroupTriggers'],
}

beforeEach(() => jest.clearAllMocks())

// CfcWorkflowStageRuleGroupViewModel.cs:26-30 binds these collections, so sending them back on a rename
// would let the save rewrite the group's own rules and triggers.
describe('stage rule group save', () => {
  it('posts the scalars only, never the child collections', () => {
    createStageRuleGroup(GROUP)
    updateStageRuleGroup(GROUP)

    const bodies = [post.mock.calls[0]?.[1]?.body, put.mock.calls[0]?.[1]?.body]
    for (const body of bodies) {
      expect(body).toEqual({
        id: 4,
        name: 'Renamed group',
        description: 'A group',
        sortOrder: 2,
        isSuccess: true,
        cfcWorkflowStageId: 9,
        mustPassAllRules: false,
      })
      expect(body).not.toHaveProperty('cfcWorkflowStageRules')
      expect(body).not.toHaveProperty('cfcWorkflowStageRuleGroupTriggers')
      expect(body).not.toHaveProperty('cfcWorkflowStageRuleGroupConstraints')
    }
  })
})

// CaseApiController.cs:839 reads stepIds from the body; in the URL they arrive null and the server throws.
it('sends step ids in the body and the intervention id in the URL', async () => {
  post.mockResolvedValue(false)
  await validateDeleteStepAction([3, 4], 12)
  expect(post).toHaveBeenCalledWith('caseapi/validateDeleteStepAction', {
    query: { manualInterventionId: '12' },
    body: [3, 4],
  })
})
