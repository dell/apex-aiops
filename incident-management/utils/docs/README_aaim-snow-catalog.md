# Dell Apex AIOps IM ServiceNow CMDB table to Catalog Upload Utility

*__aaim-snow-catalog__* is a utility intended to export a CMDB table as CSV, and upload as a catalog to Dell Apex AIOps IM (AAIM).

The utility:

* Queries the ServiceNow Table API to extract CIs (with fields being user defined)
* Save the table locally as a CSV file
* Deletes any existing catalog with the same name
* Uploads the CSV file as a AAIM data enrichment catalog

**NOTE:** Because this utility uses a "delete and replace" mechanism, this will result in a data catalog being unavailable between the delete and replace operations.
This gap in availability may result in events, alerts or incidents not being enriched - this may impact downstream functions (e.g: Correlations that rely on the enrichment data provided by the data catalog).

Care should be taken to using this in production due to the above. 

*__aaim-rep-snow-grp__* is a **Node.js** utility and requires Node.js (version 18 or higher) to be installed, available [here](https://nodejs.org)

---

## Configration

The default configuration file is `asc.conf`, and is found in the `config` directory. The file format is HJSON, a relaxed form of JSON (e.g: trailing commas and quotes are optional, and comments are supported).

Alternatively, a YAML configuration can be used, by replacing the asc.conf file with a asc.yaml file (note the default config file name is fixed).

**NOTE:** The two files are mutually exclusive, if both exist, the utility will error.

As a third option, a configuration file can be specified from the command line. This can have any name/location, but must use the correct extension.

### The HJSON config file

```JavaScript
{
    aaim: {
        apiKey: 'foo-bar-0123434-ahdgefwvbs14535'
    },
    snow: {
        hostname: 'mysnow.service-now.com',
        username: 'admin',
        password: 'foobar',
        cmdb_table: 'cmdb_ci'
        sysparm_fields: [
            "name",
            "support_group",
            "sys_class_name",
            "sys_domain"
        ],
        sysparm_query: 'install_status=1'
    }
}
```

Where:

`aaim.apiKey`:       AAIM API key  
`aaim.cmdb_alias`:   (Optional) an alternate name to use as the Data Catalog  
`snow.hostname`:   The hostname (from URI) of your ServiceNow instance  
`snow.username`:   The username used for a basic auth API request  
`snow.password`:   The password used for a basic auth API request  
`snow.cmdb_table`:   The cmdb table to be queried  
`snow.sysparm_fields`:   A list of fields to be extracted from the table  
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
  cmdb_table: 'cmdb_ci'
  sysparm_fields:
    - name
    - support_group
    - sys_class_name
  sysparm_query: 'install_status=1'
```

NOTE: This is a YAML file, so the correct indentation must be preserved.

## Usage

```
aaim-snow-catalog [-i] [-d] [-l debug] [-c config_file] [-s] [-h]
    --init:              Create a template config file (./asc-config.yaml)
    --dryrun:            Query ServiceNow, create a CSV file, but don't upload it to AAIM or delete a catalog
    --loglevel debug:    Be more verbose
    --conf config_file:  Specify an alternative config file (default is ./asc-config.yaml)
    --skip:              Skip the inital ServiceNow query if a csv file already exists
    --help:              The usage message
```

### Examples

- Run the utility

    `$ aaim-snow-catalog`

-  Query the ServiceNow table API, and create a CSV file with the defined fields. This is a great first step

    `$ aaim-snow-catalog -d`

-  If you ran the previous example successfully, use skip to simply upload the csv file

    `$ aaim-snow-catalog -s`

- Get more detail - Useful for debugging issues

    `$ aaim-snow-catalog -l debug`
