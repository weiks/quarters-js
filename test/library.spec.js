/* global describe, it, before */

import chai from 'chai'
import {Quarters} from '../lib/library.js'

chai.expect()

const expect = chai.expect

describe('Given an instance of my quarters', () => {
  let lib

  before(() => {
    lib = new Quarters()
  })
  describe('init', () => {
    it('should return baseURL', () => {
      expect(lib.baseURL).to.be.equal('')
    })
  })
})
