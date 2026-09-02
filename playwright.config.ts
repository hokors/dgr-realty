import { defineConfig, devices } from '@playwright/test';

const deployedBaseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL?.trim();
const localBaseUrl = process.env.CI ? 'http://127.0.0.1:3000' : 'http://localhost:3000';
const baseURL = deployedBaseUrl || localBaseUrl;
const browserProject = process.platform === 'win32'
  ? { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  : { name: 'chromium', use: { ...devices['Desktop Chrome'] } };

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  outputDir: 'test-results',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  // Chromium currently has a Windows profile-cleanup hang. CI still tests
  // Chromium on Linux; local Windows runs use WebKit so they exit reliably.
  projects: [browserProject],
  webServer: process.env.CI && !deployedBaseUrl
    ? {
        command: 'npm run dev -- --hostname 127.0.0.1',
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});
