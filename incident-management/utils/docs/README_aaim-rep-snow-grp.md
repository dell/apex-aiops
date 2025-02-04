# Dell Apex AIOps IM ServiceNow Assignment Group Replication Utility

*__aaim-rep-snow-grp__* is a utility intended to facilitate the replication of ServiceNow assignment groups, (and their description) in Dell Apex AIOps IM (AAIM).

The utility:

* Queries the ServiceNow Table API to list the assignment groups
* Replicates the groups in AAIM
* Fails harmlessly if the groups already exist

**NOTE:**
* The utility replicates the group name (and description if present) but *NOT* membership.  
* Paging is not implemented, so the group replication will be limited to the ServiceNow API limit (10k default).  
* The process is additive only, new groups will be added, but deleted groups will be retained.  

*__aaim-rep-snow-grp__* is a **Node.js** utility and requires Node.js (version 18 or higher) to be installed, available [here](https://nodejs.org)
---
## Configration

The default configuration file is `arsg.conf`, and is found in the `config` directory. The file format is HJSON, a relaxed form of JSON (e.g: trailing commas and quotes are optional, and comments are supported).

Alternatively, a YAML configuration can be used, by replacing the arsg.conf file with a arsg.yaml file (note the default config file name is fixed).

**NOTE:** The two files are mutually exclusive, if both exist, the utility will error.

As a third option, a configuration file can be specified from the command line. This can have any name/location, but must use the correct extension.

### The HJSON config file

```JavaScript
{
    aaim: {
        apiKey: 'foo-bar-0123434-ahdgefwvbs14535'
    },

    snow: {
        hostname: 'mysnow.service-now.com'
        username: 'admin'
        password: 'foobar'
        sysparm_query: 'active=true'
    }
}
```

Where:

`aaim.apiKey`:       AAIM API key  
`snow.hostname`:   The hostname (from URI) of your ServiceNow instance  
`snow.username`:   The username used for a basic auth API request  
`snow.password`:   The password used for a basic auth API request  
`snow.sysparm_query`:   A ServiceNow encoded query to limit the number of records returned  

Edit the config file to use your AAIM `apiKey` and specify your ServiceNow URL and credentials.

The `sysparm_query` string uses the ServiceNow "encoded query" syntax, and can be generated from the ServiceNow UI Filter. An example is:

```
    sysparm_query: 'active=true^nameLIKEoperations'
```

Which would limit groups to those that are active, and the name contains "operations".

### The YAML config file

```JavaScript
---
aaim:
  apiKey: 'foo-bar-0123434-ahdgefwvbs14535'

snow:
  hostname: 'mysnow.service-now.com'
  username: 'admin'
  password: 'foobar'
  sysparm_query: ''
```

NOTE: This is a YAML file, so the correct indentation must be preserved.

## Usage

```
aaim-rep-snow-grp [-i] [-d] [-y] [-j] [-l debug] [-c config_file] [-h]
    --init:              Create a template config file (./arsg-config.yaml)
    --dryrun:            Show what groups would be added, but don't do it.
    --yaml:              Dump the entire search results as a YAML file. (saved.yaml)
    --json:              Dump the entire search results as a JSON file. (saved.json)
    --loglevel debug:    Be more verbose
    --conf config_file:  Specify an alternative config file (default is ./arsg-config.yaml)
    --help:              The usage message
```

### Examples

- Run the utility

    `$ aaim-rep-snow-grp`

*Note:* If a group already exists in AAIM, the utility will report it as a failure ("already exists") this is intentional

- Find out what it would do (but not don't replicate the groups in AAIM), and store the group information in a YAML file

    `$ aaim-rep-snow-grp -d -y`

- Get more detail - Useful for debugging issues

    `$ aaim-rep-snow-grp -l debug`

