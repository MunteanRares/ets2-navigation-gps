import { defineNitroPlugin } from "#imports";
import { spawn, exec, execSync, spawnSync } from "node:child_process";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const REPO_URL = "https://github.com/Funbit/ets2-telemetry-server.git";
const FOLDER_NAME = "ets2-telemetry-server";
const EXE_NAME = "Ets2Telemetry.exe";

export default defineNitroPlugin((nitroApp) => {
    const rootDir = process.cwd();
    const serverDir = path.join(rootDir, FOLDER_NAME);
    const serverExeDir = path.join(serverDir, "server");
    const lockFile = path.join(serverExeDir, ".setup-complete");

    let activeChild: any = null;

    function gitExists() {
        try {
            execSync(`git --version`, { stdio: "ignore" });
            return true;
        } catch {
            return false;
        }
    }

    const killTelemetry = () => {
        if (activeChild && !activeChild.killed) {
            activeChild.kill();
        }

        try {
            spawnSync("taskkill", ["/IM", EXE_NAME, "/F", "/T"], {
                stdio: "ignore",
            });
        } catch (e) {}
    };

    const isAppRunning = () => {
        try {
            const stdout = execSync(
                `tasklist /FI "IMAGENAME eq ${EXE_NAME}"`
            ).toString();
            return stdout.includes(EXE_NAME);
        } catch (e) {
            return false;
        }
    };

    killTelemetry();

    if (!existsSync(serverDir)) {
        console.log(`[Auto-Setup] Cloning ${REPO_URL}...`);

        if (!gitExists()) {
            console.log(
                "[Auto-Setup] Git is not installed. Please download it from:\nhttps://git-scm.com/downloads\n"
            );
            return;
        }

        try {
            execSync(`git config --global core.longpaths true`);

            execSync(`git clone ${REPO_URL}`, {
                stdio: "inherit",
                cwd: rootDir,
            });

            console.log(
                "[Auto-Setup] Removing inner .git folder to prevent conflicts..."
            );
            const gitFolder = path.join(serverDir, ".git");
            if (existsSync(gitFolder)) {
                rmSync(gitFolder, { recursive: true, force: true });
            }
        } catch (e) {
            console.log("Failed cloning the repository.");
            return;
        }
    }

    if (isAppRunning()) {
        console.log(
            `\n[Telemetry] ✅ ${EXE_NAME} is already running. Skipping start.\n`
        );
    } else {
        const isFirstRun = !existsSync(lockFile);
        console.log(`\n[Telemetry] Starting ${EXE_NAME}...`);

        if (isFirstRun) {
            console.log(
                "\n⚠️  First run detected! You may close telemetry manually after exiting app.\n"
            );
            exec(`start "" "${EXE_NAME}"`, { cwd: serverExeDir });
            try {
                writeFileSync(lockFile, "installed=true");
            } catch (e) {}
        } else {
            activeChild = spawn(EXE_NAME, [], {
                cwd: serverExeDir,
                detached: false,
                stdio: "ignore",
                windowsHide: true,
            });

            activeChild.unref();
        }
    }

    const shutdown = () => {
        killTelemetry();
    };

    nitroApp.hooks.hook("close", shutdown);
});
