import axios from 'axios'

export default class Quarters {
  appKey = null
  appSecret = null

  axiosObject = null
  options = null

  contructor(appKey, appSecret, options = {}) {
    if (!appKey) {
      throw new Error('APP KEY is required.')
    }

    if (!appSecret) {
      throw new Error('APP SECRET is required.')
    }

    this.appKey = appKey
    this.appSecret = appSecret

    // options
    this.options = {
      oauthURL: options.oauthURL || 'https://pocketfulofquarters.com/oauth',
      apiURL: options.oauthURL || 'https://api.pocketfulofquarters.com'
    }

    // axios object
    this.axiosObject = axios.create({
      baseURL: this.options.baseURL
    })
  }

  login(redirect = true) {
    const oauthURL = ${this.options.oauthURL}
    const url = `${oauthURL}/authorize?response_type=code&key=appKey`

  }

  authenticate(authToken) {
    const data = {
      authToken: authToken
    }

    return axios.post('/login', data).then(apiToken => {
      // store apiToken in browser
      this.axiosObject = axios.create({
        baseURL: this.baseURL,
        headers: {
          Authorization: `Token ${apiToken}`
        }
      })
    })
  }

  requestTransfer() {
    const data = {
      tokens: 1000
    }

    // request tokens
    return this.axiosObject.post('/request-tokens', data).then(token => {
      // success
    })
  }
}
