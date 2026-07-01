import { BeforeAll, AfterAll, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as http from 'http';
import * as path from 'path';

let appProcess: ChildProcessWithoutNullStreams | undefined;
let startedByHook = false;

// Increase default timeout for hooks to allow starting the Spring Boot app
setDefaultTimeout(180000);

async function waitForServer(url: string, timeoutMs = 180000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(url, (res) => {
          res.resume();
          resolve();
        });

        req.setTimeout(1000, () => {
          req.destroy(new Error('timeout'));
        });
        req.on('error', reject);
      });
      return true;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return false;
}

async function stopAppProcess(): Promise<void> {
  if (!appProcess || appProcess.killed) {
    return;
  }

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', `${appProcess.pid}`, '/t', '/f'], { stdio: 'ignore' });
  } else {
    appProcess.kill('SIGTERM');
  }

  await new Promise<void>((resolve) => {
    appProcess?.once('exit', () => resolve());
    setTimeout(resolve, 5000);
  });
}

BeforeAll(async function () {
  const baseUrl = process.env.APP_BASE_URL || 'http://127.0.0.1:8080';
  const readinessUrl = `${baseUrl}/vulnerabilities`;

  if (await waitForServer(readinessUrl, 5000)) {
    return;
  }

  const projectRoot = path.resolve(__dirname, '..', '..');
  const mvnCommand = process.platform === 'win32' ? 'mvn.cmd' : 'mvn';

  try {
    appProcess = spawn(mvnCommand, ['spring-boot:run'], {
      cwd: projectRoot,
      // suppress child process stdout/stderr to keep test output quiet
      stdio: 'ignore',
      env: process.env,
      shell: process.platform === 'win32'
    });
  } catch (err) {
    throw err;
  }

  const started = await waitForServer(readinessUrl, 180000);
  if (!started) {
    throw new Error('Spring Boot application did not start successfully');
  }

  startedByHook = true;
});

AfterAll(async function () {
  if (startedByHook) {
    await stopAppProcess();
  }
});

Before(async function () {
  this.attach('Preparing security validation run', 'text/plain');
});

After(async function (scenario) {
  if (scenario.result?.status === 'FAILED') {
    this.attach(`Scenario failed: ${scenario.pickle.name}`, 'text/plain');
  }
});
