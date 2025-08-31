# Overview

Please find readme.md file in each subfolder for specific requirements.

Below are software requirements for these projects. It is recommended to set up these for the course, however, not all of these may be needed for each of the projects. Please consult instructor if unclear about setup.


## Arduino IDE

Install from https://www.arduino.cc/


## AI Programming IDE

Cursor: https://www.cursor.com/


## Node Package Manager

NVM is highly recommended for managing multiple versions of Node.

### Mac instruction

First, we need to install Homebrew:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

brew install nvm
```

If you have any trouble with Homebrew setup please check: https://mac.install.guide/homebrew/

Once NVM is installed, add the following lines to your shell profile (e.g., ~/.bashrc, ~/.zshrc, or ~/.bash_profile).

You can check these files by using below command:

```bash
ls -la ~/.*
```

If none of these files exist, feel free to create ~/.zshrc (or others depending Mac OS version). In order to create or edit the file:

```bash
vim ~/.zshrc
```

In the file add the below lines. If you never used vim, 'i' is the command for entering typing mode, in order to save + quit, use 'esc' to exit typing mode and use ':wq' command and hit enter.

```bash
export NVM_DIR=~/.nvm
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion
```

### Windows instruction

Download the setup version of NVM from: https://github.com/coreybutler/nvm-windows

Run the installer to install NVM.

### Linux instruction

We don't have step by step instruction here, but should be fairly straightforward. Please consult instructor if needed.

### After NVM installation, Install Node

NVM we just installed is a software to manage different Node versions easily. We now need to install a Node version that will be necessary for nodejs, react, or nextjs projects for web.

First check if NVM is properly installed in terminal.

```bash
nvm --version
```

If you confirmed installation, you can install a Node version by using below commands.

```bash
nvm install 20.19.4
nvm use 20.19.4
```

'nvm use' is the command to set the default Node version to the one installed. You can check if it is set up correctly by

```bash
nvm current
```


## Python

Python 3.10 or 3.11 is highly recommended.

### Mac instruction

Highly recommend using Homebrew to install Python. Homebrew is a generally useful package manager for Mac.

If you have already installed Homebrew, you can skip this step. If you haven't, please:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

If you have any trouble with Homebrew setup please check: https://mac.install.guide/homebrew/

Once Homebrew is installed, install python.

```bash
brew install python@3.11
```

### Windows instruction

Use your preferred method. Microsoft store version should work fine and is easy. You can also get the installer from the official python website: https://www.python.org/downloads/
