import * as core from '@actions/core'
import * as github from '@actions/github'
import * as http from '@actions/http-client'
import { wait } from './wait.js'
import * as fs from 'fs'

/**
 * The main function for the action.
 *
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run() {
  try {
    await check_fabric();
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

async function check_fabric() {
  const client = new http.HttpClient("my-action");

    const response = await client.get(
        "https://meta.fabricmc.net/v2/versions/game"
    );

    if (response.message.statusCode !== 200) {
        throw new Error(`HTTP ${response.message.statusCode}`);
    }

    const body = await response.readBody();
    const versions = JSON.parse(body);
    const latestStableVersion = versions.find(v => v.stable)?.version;
    console.log(`Latest stable version: ${latestStableVersion}`);
    const octokit = github.getOctokit(core.getInput('github-token', { required: true }));
    const { owner, repo } = github.context.repo;

const branches = await octokit.rest.repos.listBranches({
  owner,
  repo,
});
if (!branches.data.some(branch => branch.name === latestStableVersion || branch.name === `dev-${latestStableVersion}`)) {
  const fabric_api = await client.get(`https://api.modrinth.com/v2/project/fabric-api/version`).then (res => res.readBody()).then(body => JSON.parse(body)).then(
    data => data.find(version => version.game_versions.includes(latestStableVersion)).version_number
  );
  const loader_version = await client.get(`https://meta.fabricmc.net/v2/versions/loader`).then (res => res.readBody()).then(body => JSON.parse(body)).then(
    data => data.find(version => version.stable).version
  );
  const client_args_version = await octokit.rest.repos.listReleases({
    owner: "xpple",
    repo: "clientarguments", // Assuming the first release is the one you want to update
  }).then(response => {
    return response.data.sort((a, b) => new Date(b.published_at) - new Date(a.published_at))[0].tag_name.replace(/^v/, '')}); // Remove leading 'v' if present
  const gradlePropertiesFile = await octokit.rest.repos.getContent({
    owner,
    repo,
    path: 'gradle.properties',
    ref: '26.2' // Assuming 'main' is the default branch
  });
  const gradleProperties = Buffer.from(gradlePropertiesFile.data.content, 'base64').toString('utf8');
  const updatedGradleProperties = gradleProperties.replace(/fabric_version=.+/, `fabric_version=${fabric_api}`)
                                                  .replace(/minecraft_version=.+/, `minecraft_version=${latestStableVersion}`)
                                                  .replace(/loader_version=.+/, `loader_version=${loader_version}`)
                                                  .replace(/client_arguments_version=.+/, `client_arguments_version=${client_args_version}`);
  console.log(`Updated gradle.properties:\n${updatedGradleProperties}`);
  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/dev-${latestStableVersion}`,
    sha: branches.data.find(branch => branch.name === '26.2').commit.sha, // Assuming 'main' is the default branch
  });
                                            
  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: 'gradle.properties',
    message: 'Update version properties',
    content: Buffer.from(updatedGradleProperties).toString('base64'),
    branch: `dev-${latestStableVersion}`,
    sha: gradlePropertiesFile.data.sha
  });
  //fs.writeFileSync('gradle.properties', updatedGradleProperties, 'utf8');
} else {
  console.log(`Branch for version ${latestStableVersion} already exists. No update needed.`);
  return false; // No update needed
}
}