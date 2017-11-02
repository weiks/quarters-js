import axios from 'axios'

const openPopup = (url, width = 850, height = 600) => {
  const left = (screen.width - width) / 2
  const top = (screen.height - height) / 4
  const params = `width=${width},height=${height},left=${left},top=${top}`
  return window.open(url, 'quarters-oauth', params)
}

export default class Quarters {
  constructor(appKey, appSecret, options = {}) {
    if (!appKey) {
      throw new Error('APP KEY is required.')
    }

    if (!appSecret) {
      throw new Error('APP SECRET is required.')
    }

    this.appKey = appKey
    this.appSecret = appSecret

    // options
    const quartersURL = options.quartersURL || 'https://pocketfulofquarters.com'
    this.options = {
      quartersURL: quartersURL,
      redirectURL: `${quartersURL}/oauth/javascript_sdk_redirect`,
      oauthURL: options.oauthURL || `${quartersURL}/oauth`,
      apiURL: options.apiURL || 'https://api.pocketfulofquarters.com/'
    }

    // axios object
    this.axiosObject = axios.create({
      baseURL: this.options.apiURL
    })
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
    const url = `${oauthURL}/authorize?response_type=code&key=${this.appKey}`
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

  _authToken(token, isRefreshToken) {
    const data = {
      client_id: this.appKey,
      client_secret: this.appSecret
    }

    if (isRefreshToken) {
      data.grant_type = 'refresh_token'
      data.refresh_token = token
    } else {
      data.grant_type = 'authorization_code'
      data.code = token
    }

    return this.axiosObject.post('/oauth/token', data).then(apiToken => {
      // store apiToken in browser
      this.axiosObject = axios.create({
        baseURL: this.options.apiURL,
        headers: {
          Authorization: `Token ${apiToken}`
        }
      })
    })
  }

  oauthToken(code) {
    return this._authToken(code)
  }

  authToken(refreshToken) {
    return this._authToken(refreshToken, true)
  }

  requestTransfer(tokens) {
    const data = {
      tokens
    }

    // request tokens
    return this.axiosObject.post('/request-tokens', data).then(token => {
      // success
    })
  }

  me() {
    return this.axiosObject.get('/me')
  }
}
