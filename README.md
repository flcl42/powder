# Powder - store passwords as text easily

The extension allows to encrypt passwords with a master password.<br>
It enables CodeLens (inline text actions) for any text that looks like:

> <b>login:password</b>

Password part can be encrypted, decrypted and copied to clipboard.  

## Example

<sub><span style="text-decoration: underline;">Hide Password</span> | <span style="text-decoration: underline;">Copy Password</span></sub><br>
test<span>@example.<span>com:password123

↓
Click Hide Password, enter master password
↓

<sub><span style="text-decoration: underline;">Unhide Password</span> | <span style="text-decoration: underline;">Copy Password</span></sub><br>
test<span>@example.<span>com:AAF5etlyDen/7nX6nbJ5IUY+v/1d5NC3RFMxLxnHhGwRfHOI4cfyQfWtSs41Z6OAdu/Gn78=

Unhide password leads to decryption.<br>
You can copy hidden password, master password is required.

## Encryption Details

Standard browser encryption API is used.<br>
AES-GCM 256 bit is used for the payload.<br>
Both the master password and the payload are salted with 196 bit of different random data.<br>

Encrypted data format is a base64 value of:
- 1 byte starting mark = 0
- 1 bytes version mark
- 12 bytes password salt
- 12 bytes payload salt
- N>0 byte payload, which contains:
  - length of data as a string
  - '\0' separator
  - payload

## Development

Contribution is welcome!

To start development:
- install `yarn`;
- clone the repository;
- run `yarn` command to install packages;
- press `F5` to test and debug;
- create PR after

## Roadmap

- Encryption of all the lines in a file with one command
- Improving payload length handling
- More compact encrypted line without damaging encryption strength
- Should we also enable login encryption?
- What else can we encrypt?
- Powder mode - change Hide Password/Unhide Password with Powder/Unpowder