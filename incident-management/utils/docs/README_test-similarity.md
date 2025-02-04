# Dell Apex AIOps Correlation Engine Similarity tester 

### Description

*__test-similarity__* is a utility that provides a similarity score between two strings that can be used as a guide to configuring a Correlation definition similarity percentage. 

### Usage

```
test-similaroty -h 

Returns the similarity of two strings, using words or shingles

Options:
  -V, --version              output the version number
  -c,--shingle-size <size>   Shingle size (character count) (default: 3)
  -w,--words                 Use words not shingles
  -d,--debug
  -s,--strings <strings...>  The two strings to compare (use quoted strings)
  -h, --help                 display help for command

```
<p>

- Use either -c (--shingle-size) or -w (--words) for the tokenisation mechanism. 
    - Correlation Engine uses words for the following core fields
        - description, agent, class, manager
    - Correlation Engine uses a 3 letter shingle size for 
        - service, source, location

- Strings should be quoted if they contain whitespaces
  - Only two strings should be supplied.

e.g. 

```
test-similarty -w -s "this is a cat" "cat a is this" 
```
### Output 

The output will provide the percentage similarity with the chosen similarity mechanism (words or shingles)

```./test-similarity -w -s "This is an alert description" "This is another alert description"

  ---------------------------------
  Using words
  ---------------------------------
  This is an alert description
  This is another alert description
  ---------------------------------
  Similarity : 80%
  ---------------------------------
```

Use the ```-d``` flag to produce more detailed output : 

```
./test-similarity -d -w -s "This is an alert description" "This is another alert description"
2024-08-14T11:33:46.038Z : DEBUG : String : This is an alert description : shingled to : ["this","is","an","alert","description"]
2024-08-14T11:33:46.041Z : DEBUG : String : This is another alert description : shingled to : ["this","is","another","alert","description"]
2024-08-14T11:33:46.041Z : DEBUG : Intersect : ["this","is","alert","description"]

  ---------------------------------
  Using words
  ---------------------------------
  This is an alert description
  This is another alert description
  ---------------------------------
  Similarity : 80%
  ---------------------------------
```

When using shingles and debug (-d), these will be listed. Shingles overlap, so may produce unexpected results. 

For example, "host123" shingles to  ["hos","ost","st1","t12","123"] when using 3 letter shingles. 
<p>

```
./test-similarity -d -c3 -s "host123" "host124"                                               
2024-08-14T11:36:14.740Z : DEBUG : String : host123 : shingled to : ["hos","ost","st1","t12","123"]
2024-08-14T11:36:14.743Z : DEBUG : String : host124 : shingled to : ["hos","ost","st1","t12","124"]
2024-08-14T11:36:14.743Z : DEBUG : Intersect : ["hos","ost","st1","t12"]

  -----------------------
  Using 3 letter shingles
  -----------------------
  host123
  host124
  -----------------------
  Similarity : 80%
  -----------------------
```

---

