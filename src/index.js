import axios from 'axios'

const openPopup = (url, width = 850, height = 600) => {
  const left = (screen.width - width) / 2
  const top = (screen.height - height) / 4
  const params = `width=${width},height=${height},left=${left},top=${top}`
  return window.open(url, 'quarters-oauth', params)
}

export default class Quarters {
  constructor(options = {}) {
    if (!options.appKey) {
      throw new Error('APP KEY is required.')
    }

    if (!options.appSecret) {
      throw new Error('APP SECRET is required.')
    }

    // options
    const quartersURL = options.quartersURL || 'https://pocketfulofquarters.com'
    this.options = {
      appKey: options.appKey,
      appSecret: options.appSecret,
      quartersURL: quartersURL,
      redirectURL: `${quartersURL}/oauth/javascript_sdk_redirect`,
      oauthURL: options.oauthURL || quartersURL,
      apiURL: options.apiURL || 'https://api.pocketfulofquarters.com/'
    }

    // axios object
    this.axiosObject = this._getAxiosObject()
  }

  _getAxiosObject(apiToken) {
    const options = {
      baseURL: this.options.apiURL,
      headers: {}
    }

    if (apiToken) {
      options.headers['Authorization'] = `Bearer ${apiToken}`
    }

    // store apiToken in browser
    return axios.create(options)
  }

  /**
   * Authorize user with oauth
   *
   * @param options object
   *        - redirect: boolean. Default false. If set true it redirects instead of popup
   *        - success: function. To get `code` code from child oauth popup (used when redirect is false)
   */
  authorize(options = {}) {
    const oauthURL = this.options.oauthURL
    const url = `${oauthURL}/oauth/authorize?response_type=code&client_id=${this
      .options.appKey}`
    if (options.redirect) {
      const redirectURI = encodeURIComponent(
        `${location.protocol}//${location.host}${location.pathname}`
      )
      window.location.href = `${url}&redirect_uri=${redirectURI}`
    } else {
      // receive message from popup
      const receiveMessage = event => {
        if (event.origin !== this.options.quartersURL) {
          return
        }

        event.source.close()
        const data = JSON.parse(event.data)
        options.success && options.success(data) // success method on data
      }
      window.addEventListener('message', receiveMessage, false)

      // open popup
      return openPopup(url)
    }
  }

  setAuthCode(code) {
    const data = {
      client_id: this.options.appKey,
      client_secret: this.options.appSecret,
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

    const data = {
      client_id: this.options.appKey,
      client_secret: this.options.appSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }

    return axios
      .post(`${this.options.apiURL}oauth/token`, data)
      .then(response => {
        const {access_token} = response.data
        this.axiosObject = this._getAxiosObject(access_token)
        return response.data
      })
  }

  getRefreshToken() {
    return this.refreshToken
  }

  requestTransfer(tokens) {
    const data = {
      tokens
    }

    // request tokens
    return this.axiosObject.post('/request-tokens', data).then(response => {
      // success
    })
  }

  me() {
    return this.axiosObject.get('/me').then(response => response.data)
  }
}
