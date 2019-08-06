import axios from 'axios'

const openPopup = (url, width = 850, height = 600) => {
  const left = (screen.width - width) / 2
  const top = (screen.height - height) / 4
  const params = `width=${width},height=${height},left=${left},top=${top}`
  return window.open(url, 'quarters-oauth', params)
}

export default class Quarters {
  constructor(options = {}) {
    if (!options.appId) {
      throw new Error('APP ID is required.')
    }

    if (!options.appKey) {
      throw new Error('APP KEY is required.')
    }

    // options
    const quartersURL = options.quartersURL || 'https://pocketfulofquarters.com'
    this.options = {
      appId: options.appId,
      appKey: options.appKey,
      quartersURL: quartersURL,
      redirectURL: `${quartersURL}/oauth/javascript_sdk_redirect`,
      oauthURL: options.oauthURL || quartersURL,
      apiURL: options.apiURL || 'https://api.pocketfulofquarters.com/'
    }

    // axios object
    this.axiosObject = this._getAxiosObject()

    // account object cache
    this.account = null
  }

  _getAxiosObject(apiToken) {
    const options = {
      baseURL: this.options.apiURL,
      headers: {}
    }

    let intercept = null
    if (apiToken) {
      options.headers['Authorization'] = `Bearer ${apiToken}`
      intercept = true
    }

    // store apiToken in browser
    const obj = axios.create(options)
    if (intercept) {
      // intercept response to check if 401 (Unauthorized with code 'token-expired')
      obj.interceptors.response.use(
        response => {
          return response
        },
        error => {
          const orgRequest = error.config
          if (
            error.response.status === 401 &&
            error.response.data &&
            error.response.data.code === 'token-expired' &&
            !orgRequest._retry
          ) {
            orgRequest._retry = true
            this.refreshAccessToken().then(data => {
              const {access_token} = data // eslint-disable-line
              orgRequest.headers['Authorization'] = `Bearer ${access_token}` // eslint-disable-line
              return axios(orgRequest)
            })
          }
          return Promise.reject(error)
        }
      )
    }

    return obj
  }

  _requestFromQuarters(url, type, success) {
    if (type === 'redirect') {
      const redirectURI = encodeURIComponent(
        `${location.protocol}//${location.host}${location.pathname}`
      )
      window.location.href = `${url}&redirect_uri=${redirectURI}`
      return
    }

    // receive message from popup/iframe
    const receiveMessage = event => {
      let data = null
      try {
        data = JSON.parse(event.data)
      } catch (e) {
        console.log(e)
      }

      if (event.origin !== this.options.quartersURL || !data) {
        return
      }

      if (event.source && event.source.close) {
        event.source.close()
      }

      // remove attached iframe
      if (data.frameId) {
        const frameEl = document.getElementById(data.frameId)
        if (frameEl) {
          document.body.removeChild(frameEl)
        }
      }

      success(data) // success method on data

      // remove event listener
      window.removeEventListener('message', receiveMessage)
    }

    // add event listener
    window.addEventListener('message', receiveMessage, false)

    if (type === 'popup') {
      // open popup
      return openPopup(url)
    }

    // iframe
    const frameId = `quarters_iframe_${Date.now()}`
    const iframeURL = `${url}&frame_id=${frameId}`
    const f = document.createElement('IFRAME')
    f.setAttribute('src', iframeURL)
    f.setAttribute('id', frameId)
    f.setAttribute(
      'style',
      'position: fixed; max-width: 440px; width: 100%; height: 100%; top: 15vh; left: 0; right: 0; bottom: 0; margin: 0 auto; z-index: 1000; border: 0px none transparent; background-color: transparent; box-shadow: 0 0 300px 50px rgba(254, 221, 30, 0.5);'
    )
    f.setAttribute('frameBorder', '0')

    // append child
    document.body.appendChild(f)
  }

  /**
   * Authorize user with oauth
   *
   * @param type: string. Default 'iframe'. Possible values: 'iframe', 'popup' and 'redirect'
   * @param success: function. To get `code` code from child oauth popup/iframe
   */
  authorize(type = 'iframe', success = () => {}, forceSignup = false) {
    const oauthURL = this.options.oauthURL
    let url = `${oauthURL}/oauth/authorize?response_type=code&client_id=${this
      .options.appId}&inline=true`

    if (forceSignup) {
      url += '&force_signup=true'
    }

    return this._requestFromQuarters(url, type, success)
  }

  setAuthCode(code) {
    const data = {
      client_id: this.options.appId,
      client_secret: this.options.appKey,
      grant_type: 'authorization_code',
      code: code
    }

    return axios
      .post(`${this.options.apiURL}oauth/token`, data)
      .then(response => {
        const {access_token, refresh_token} = response.data
        this.refreshToken = refresh_token //  eslint-disable-line
        this.axiosObject = this._getAxiosObject(access_token)
        return response.data
      })
  }

  setRefreshToken(refreshToken) {
    this.refreshToken = refreshToken
    return this.refreshAccessToken()
  }

  getRefreshToken() {
    return this.refreshToken
  }

  refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('Refresh token not found')
    }

    const data = {
      client_id: this.options.appId,
      client_secret: this.options.appKey,
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken
    }

    return axios
      .post(`${this.options.apiURL}oauth/token`, data)
      .then(response => {
        const {access_token} = response.data
        this.axiosObject = this._getAxiosObject(access_token)
        return response.data
      })
  }

  // user details
  me() {
    return this.axiosObject.get('/me').then(response => response.data)
  }

  // user account
  getAccount() {
    if (this.account) {
      return new Promise(resolve => {
        resolve(this.account)
      })
    }

    return this.axiosObject
      .get(`/accounts`)
      .then(response => response.data)
      .then(accounts => {
        if (accounts.length > 0) {
          this.account = accounts[0]
        }

        return this.account
      })
  }

  // user balance
  getBalance() {
    return this.getAccount()
      .then(account => {
        return this.axiosObject.get(`/accounts/${account.address}/balance`)
      })
      .then(response => response.data)
  }

  // request transfer from quarter server
  requestTransfer(data) {
    if (!data.tokens) {
      throw new Error('`tokens` value is required')
    }

    const payload = {
      tokens: parseInt(data.tokens),
      description: data.description,

      // app id (required)
      appId: this.options.appId
    }

    // request tokens
    return this.axiosObject
      .post('/requests', payload)
      .then(response => response.data)
  }

  /**
     * Authorize transfer request
     *
     * @param requestId: string. Request id
     * @param type: string. Default 'iframe'. Possible values: 'iframe', 'popup' and 'redirect'
     * @param success: function. To get data from iframe/popup
     */
  authorizeTransfer(requestId, type = 'iframe', success = () => {}) {
    const oauthURL = this.options.oauthURL
    const url = `${oauthURL}/requests/${requestId}?client_id=${this.options
      .appId}&inline=true`

    return this._requestFromQuarters(url, type, success)
  }
}
