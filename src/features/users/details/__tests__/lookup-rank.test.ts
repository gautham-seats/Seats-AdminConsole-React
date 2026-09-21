import { rankLookupItems } from '../lookup-rank'

const item = (id: number, description: string) => ({ id, description })

describe('rankLookupItems', () => {
  it('drops results whose JSON lacks the query and puts case-sensitive matches first', () => {
    const rows = [item(1, 'smith, john'), item(2, 'Smith, John'), item(3, 'Jones, Amy')]
    expect(rankLookupItems(rows, 'Smith', 8).map(row => row.id)).toEqual([2, 1])
    expect(rankLookupItems(rows, 'Smith John', 8)).toEqual([])
  })

  it('keeps only maxResults unless the box is empty', () => {
    const rows = Array.from({ length: 12 }, (_, index) => item(index + 1, `Student ${index + 1}`))
    expect(rankLookupItems(rows, 'Student', 8)).toHaveLength(8)
    expect(rankLookupItems(rows, '', 8)).toHaveLength(12)
  })
})
