import { jest } from '@jest/globals'

const mockGet = jest.fn()
const mockListBranches = jest.fn()
const mockCreateRef = jest.fn()
const mockCreateOrUpdateFileContents = jest.fn()

jest.unstable_mockModule('@actions/core', () => ({
  getInput: jest.fn(() => 'fake-token'),
  setFailed: jest.fn()
}))

jest.unstable_mockModule('@actions/github', () => ({
  context: {
    repo: {
      owner: 'me',
      repo: 'calcmod'
    }
  },
  getOctokit: jest.fn(() => ({
    rest: {
      repos: {
        listBranches: mockListBranches,
        createOrUpdateFileContents: mockCreateOrUpdateFileContents,
        listReleases: jest.fn()
      },
      git: {
        createRef: mockCreateRef
      }
    }
  }))
}))

jest.unstable_mockModule('@actions/http-client', () => ({
  HttpClient: jest.fn(() => ({
    get: mockGet
  }))
}))

jest.unstable_mockModule('fs', () => ({
  readFileSync: jest.fn(),
  writeFileSync: jest.fn()
}))

const { check_fabric } = await import('../src/main.js')