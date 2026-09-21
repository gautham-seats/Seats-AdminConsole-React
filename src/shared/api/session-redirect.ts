// A signed-out session answers with a redirect to the identity provider; followed, it fails CORS and
// looks like a network fault, so requests leave it unfollowed and read it as "sign in again".
export function isSessionRedirect(response: Pick<Response, 'type' | 'status'>): boolean {
  return response.type === 'opaqueredirect' || (response.status >= 300 && response.status < 400)
}
