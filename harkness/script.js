(function () {
    /**
     * @typedef Record
     * @type {object}
     * @property {number} id
     * @property {string} user
     * @property {number} duration
     * @property {string} note
     */

    /**
     * @typedef Current
     * @type {?object}
     * @property {string} user
     * @property {number} duration
     * @property {string} note
     * @property {?number} latestStartTime
     */


    /* Constants */

    const USER_COLUMNS = 2;
    const OFFSET_PIXELS = 3;
    const COMMANDS = [
        'start-log',
        'pause-log',
        'edit-log',
        'remove-log',
        'add-users',
        'delete-users',
        'note',
    ];

    /* Variables */

    let users = [];

    /** @type {Current} */
    let current = null;

    let database = [];

    let currentId = 1;

    /*
      All rows in the table come from both `database` and `current`. `current` should always be non-`null` unless
      there's absolutely no rows. As such, `current == null` implies `database.length == 0`
    */

    /**
     * @param {number} id
     * @param {string} user
     * @param {number} duration
     * @param {string} note
     * @returns {Record}
     */
    function makeRecord(id, user, duration, note) {
        return {
            id: id,
            user: user,
            duration: duration,
            note: note,
        };
    }

    function getLabels() {
        return database.map(row => row.id).concat(current == null ? [] : [current.id]);
    }

    function prefixMatcher(q, cb) {
        const autocomplete = [
            {
                pattern: ':delete-users ',
                target: () => users
            },
            {
                pattern: ':start-log ',
                target: () => [''].concat(users)
            },
            {
                pattern: ':remove-log ',
                target: getLabels
            },
            {
                pattern: ':edit-log \\d+ user ',
                target: () => users
            },
            {
                pattern: ':edit-log \\d+ ',
                target: () => ['user', 'duration', 'note']
            },
            {
                pattern: ':edit-log ',
                target: getLabels
            },
            {
                pattern: ':',
                target: () => COMMANDS
            },
            {
                pattern: '\\+',
                target: () => [''].concat(users)
            }
        ];

        autocomplete.some(({pattern, target}) => {
            const result = (new RegExp('^' + pattern)).exec(q);
            if (result == null) return false;

            const matches = [];
            target().forEach(str => {
                if ((result[0] + str).toLowerCase().startsWith(q.toLowerCase())) {
                    matches.push(result[0] + str + ' ');
                }
            });
            cb(matches);
            return true;
        });
    }

    function getCurrentSec() {
        return Math.floor(Date.now() / 1000);
    }

    function setCurrent(id, user, duration, latestStartTime, note) {
        current = {
            id: id,
            user: user,
            duration: duration,
            latestStartTime: latestStartTime,
            note: note
        };
    }

    /**
     * @param {number} n
     */
    function durationToString(n) {
        const seconds = n % 60;
        const mins = Math.floor(n / 60);
        return `${mins} m ${seconds} s`;
    }

    function getFreshDatabase() {
        return database.concat((current != null) ? [getCurrentRecordUnsafe()] : []);
    }

    function popRecordAndRow() {
        if (current == null) return;
        if (database.length > 0) {
            const lastRow = database.pop();
            setCurrent(lastRow.id, lastRow.user, lastRow.duration, null, lastRow.note);
            currentId = lastRow.id;
        } else {
            current = null;
            currentId = 1;
        }
        removeLastRowUnsafe();
    }

    function isUserActive(user) {
        return current != null && current.user == user && current.latestStartTime != null;
    }

    /* Precondition: current != null */
    function getCurrentRecordUnsafe() {
        return makeRecord(current.id, current.user, getCurrentDurationUnsafe(), current.note);
    }

    /* Precondition: current != null */
    function getCurrentDurationUnsafe() {
        return current.duration +
            ((current.latestStartTime == null) ?
             0 : getCurrentSec() - current.latestStartTime);
    }

    function refreshUsers() {
        const tds = users.map(user => {
            const td = $('<td/>')
                  .text(user)
                  .click(e => update(isUserActive(user) ?
                                     ':pause-log' :
                                     `:start-log ${user}`));
            if (isUserActive(user)) td.addClass('active');
            return td;
        }).reverse();

        const ul = $('#userList tbody');
        ul.empty();

        while (tds.length > 0) {
            const tr = $('<tr/>');
            for (let i = 0; i < USER_COLUMNS && tds.length > 0; i++) {
                tr.append(tds.pop());
            }
            ul.append(tr);
        }
    }

    function refreshLogs() {
        clearLogTable();
        getFreshDatabase().forEach(row => appendTableRow(recordToRow(row)));
    }

    /**
     * @param {Record} record
     * @returns {JQuery}
     */
    function recordToRow(record) {
        function clickEvent(field, val) {
            return e => {
                $('#command').typeahead('val', `:edit-log ${record.id} ${field} ${JSON.stringify(val)}`);
                $('#command').focus();
            };
        }
        const tr = $('<tr/>')
              .append($('<td/>').text(record.id))
              .append($('<td/>').text(record.user).click(clickEvent('user', record.user)))
              .append($('<td/>').text(durationToString(record.duration)).click(clickEvent('duration', record.duration)))
              .append($('<td/>').text(record.note).click(clickEvent('note', record.note)));
        if (current != null && record.id == currentId && current.latestStartTime != null) {
            tr.addClass('active');
        }
        return tr;
    }

    function scrollLog() {
        const elem = document.getElementById('app-container');
        elem.scrollTop = elem.scrollHeight;
    }

    function log(msg) {
        function pad(x) {
            x = x + '';
            if (x.length == 1) {
                x = '0' + x;
            }
            return x;
        }
        const now = new Date();
        msg = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}` + ' ' + msg;
        $('#message').val($('#message').val() + '\r\n' + msg);

        const textarea = document.getElementById('message');
        textarea.scrollTop = textarea.scrollHeight;
    }

    function appendTableRow(tr) {
        $('#app-table-body').append(tr);
    }

    /* Precondition: current != null */
    function removeLastRowUnsafe() {
        $('#app-table-body tr:last').remove();
    }

    function clearLogTable() {
        $('#app-table-body').empty();
    }

    function parse(cmd) {
        try {
            return parser.parse(cmd);
        } catch (e) {
            if (e instanceof parser.SyntaxError) {
                log(`Attempting to parse: ${cmd}`);
                log(`Parse error: ${e.message}`);
            }
        }
        return null;
    }

    /**
     * @param {string} target
     */
    function getRecordIndex(target) {
        const id = Number(target);
        if (Number.isNaN(id)) {
            log(`${target} is not a log id. Aborted.`);
            return null;
        }
        const index = database.findIndex(record => record.id == id);
        if (index == -1) log(`Log id ${id} is not found. Aborted.`);
        return index;
    }

    function update(cmd) {
        cmd = cmd.trim();
        let mode = null;
        let args = null;
        if (cmd.startsWith('+')) {
            mode = 'start-log';
            args = parse(cmd.substr(1));
            if (args == null) return;
        } else if (cmd.startsWith(':')) {
            args = parse(cmd.substr(1));
            if (args == null) return;
            mode = args.shift();
        } else {
            mode = 'note';
            args = [cmd];
        }

        function badArity(comb) {
            if (!comb.pred(args.length)) {
                log(`Wrong number of arguments: expect ${comb.error}, got ${args.length}`);
                return true;
            }
            return false;
        }

        switch (mode) {
        case 'start-log': {
            if (badArity(arity.LE(1))) return;

            if (args.length == 0) {
                if (current == null) {
                    log(`Can't start. Aborted.`);
                    return;
                }
                args.push(current.user);
            }

            const user = args[0];

            if (! users.includes(user)) {
                log(`User ${user} is not in the user list. Aborted.`);
                return;
            }

            if (current != null && user == current.user) {
                if (current.latestStartTime != null) {
                    log(`User ${current.user} has already started. Aborted.`);
                    return;
                }
                current.latestStartTime = getCurrentSec();
            } else {
                if (current != null) {
                    const record = getCurrentRecordUnsafe();
                    database.push(record);
                    currentId++;
                    removeLastRowUnsafe();
                    appendTableRow(recordToRow(record));
                    log(`User ${current.user} finishes after ${durationToString(record.duration)}`);
                }
                setCurrent(currentId, user, 0, getCurrentSec(), '');
                appendTableRow(recordToRow(getCurrentRecordUnsafe()));
            }
            scrollLog();
            refreshUsers(); // could be more efficient, but we don't care here

            log(`User ${user} starts.`);

        } break;

        case 'remove-log': {
            if (badArity(arity.EQ(1))) return;
            const target = args[0];
            if (target != current.id) {
                const rowIndex = getRecordIndex(target);
                if (rowIndex == -1) return;
                database.splice(rowIndex, 1);
                refreshLogs();
            } else {
                popRecordAndRow();
                refreshUsers(); // could be more efficient, but we don't care here
            }

            log(`Remove log ${target}`);
        } break;

        case 'pause-log': {
            if (badArity(arity.EQ(0))) return;
            if (current == null) {
                log("Can't pause. Aborted");
                return;
            }
            current.duration = getCurrentDurationUnsafe();
            current.latestStartTime = null;

            scrollLog();
            refreshUsers(); // could be more efficient, but we don't care here

            log('Paused.');

        } break;

        case 'edit-log': {
            if (badArity(arity.EQ(3))) return;
            if (current == null) {
                log("Can't edit.");
                return;
            }

            const target = args[0];
            const field = args[1];
            const val = args[2];

            let rowObj;

            if (target == current.id) {
                rowObj = getCurrentRecordUnsafe();
            } else {
                const rowIndex = getRecordIndex(target);
                if (rowIndex == -1) return;
                rowObj = database[rowIndex];
            }

            switch (field) {
            case 'user': {
                if (! users.includes(val)) {
                    log(`${val} is not in the user list. Aborted.`);
                    return;
                }
                rowObj.user = val;
            } break;

            case 'duration': {
                const duration = Number(val);
                if (Number.isNaN(duration)) {
                    log(`${val} is not a duration (in seconds). Aborted.`);
                    return;
                }
                rowObj.duration = duration;
            } break;

            case 'note': {
                rowObj.note = val;
            } break;

            default:
                log(`Unknown subcommand: ${field}`);
                return;
            }

            if (target == current.id) {
                current.user = rowObj.user;
                current.duration = rowObj.duration;
                current.note = rowObj.note;
                if (field == 'duration' && current.latestStartTime != null) {
                    current.latestStartTime = getCurrentSec();
                }
            }
            // no need to update otherwise since we mutate the structure directly already
            // don't scroll since the edit could be on non-last rows
            refreshLogs();

            log(`Edited.`);
        } break;

        case 'note': {
            if (current == null) {
                log(`Can't note. Aborted.`);
                return;
            }
            current.note += args[0] + '\n';
            scrollLog();

            log('Note added.');
        } break;

        case 'add-users': {
            args.forEach(user => {
                if (users.includes(user)) {
                    log(`User ${user} already exists. Skipped.`);
                    return;
                }
                users.push(user);

                log(`User ${user} is added.`);
            });

            refreshUsers(); // could be more efficient, but we don't care here
        } break;

        case 'delete-users': {
            const currentFreshDatabase = getFreshDatabase();
            args.forEach(user => {
                const idx = users.indexOf(user);
                if (idx == -1) {
                    log(`${user} is not a user. Skipped.`);
                    return;
                }
                if (currentFreshDatabase.some(record => record.user == user)) {
                    log(`${user} exists in the log. Skipped.`);
                    return;
                }

                users.splice(idx, 1);
                log(`User ${user} is removed.`);
            });

            refreshUsers(); // could be more efficient, but we don't care here
        } break;

        default:
            log(`Unknown command: ${mode}`);
            return;
        }
    }

    setInterval(() => {
        if (current != null) {
            const elem = document.getElementById('app-container');
            const offset = elem.scrollHeight - elem.scrollTop - elem.clientHeight;
            removeLastRowUnsafe();
            appendTableRow(recordToRow(getCurrentRecordUnsafe()));
            if (Math.abs(offset) <= OFFSET_PIXELS) {
                elem.scrollTop = elem.scrollHeight;
            }
        }
    }, 500);


    $('#command').typeahead({
        highlight: true,
    }, {
        source: prefixMatcher
    });

    $('#command').keyup(e => {
        if (e.keyCode == 13) {
            update($('#command').val());
            $('#command').typeahead('val', '');
        }
    });

    $('body').keyup(e => {
        if (e.keyCode == 9) {
            $('#command').focus();
        }
    });

    refreshUsers();

    $('#command').focus();

    $('#file-save').click(e => {
        log('Save requested');
        const saver = $('#file-save');
        saver.attr('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(
            Papa.unparse(users.map(user => makeRecord(-1, user, 0, '')).concat(getFreshDatabase()))
        ));
        saver.attr('download', 'harkness-log.csv');
    });

    const reader = new FileReader();
    reader.onload = (e) => {
        const data = Papa.parse(reader.result, {header: true});
        if (data.errors.length > 0) {
            log(`Can't load ${f.name}. Aborted.`);
            return;
        }
        // TODO: need to handle malformed csv
        // this includes when users appear in log entries but not
        // user lists
        users = [];
        database = [];
        clearLogTable();
        data.data.forEach(record => {
            // TODO: this should log an error message if it errors
            record.duration = Number(record.duration);
            if (record.id == -1) {
                users.push(record.user);
            } else {
                database.push(record);
                appendTableRow(recordToRow(record));
            }
        });

        // this is so that we can call popRecordAndRow
        // which will set everything up
        setCurrent(0, '', 0, null, '');
        appendTableRow(recordToRow(getCurrentRecordUnsafe()));
        popRecordAndRow();

        refreshUsers();
        log('Load successfully');
    };

    $('#file-load').change(e => {
        const f = e.target.files[0];
        if (f) reader.readAsText(f);
    });

    $('#help').click(e => {
        $('#dialog').dialog('open');
    });

    $('#dialog').dialog({
        width: 900,
        height: 500,
        autoOpen: false,
        modal: true,
    });

    function d3eval() {
        const b = 300;
        const a = 100;
        var diameter = 400,
            width = 800,
            radius = diameter / 2,
            innerRadius = radius - 50;

        var cluster = d3.cluster()
            .size([360, innerRadius]);

        function getNewDY(d) {
            const theta = Math.abs(d.x / 180 * Math.PI);
            const cosComp = b * Math.cos(theta);
            const sinComp = a * Math.sin(theta);
            return a * b * d.y / (innerRadius *
                                  Math.sqrt(cosComp * cosComp +
                                            sinComp * sinComp));
        }

        function getLine() {
            const randomFactor = 0.5 + (Math.random() * 0.5);
            return d3.radialLine()
                .curve(d3.curveBundle.beta(randomFactor))
                .radius(getNewDY)
                .angle(function(d) { return d.x / 180 * Math.PI; });
        }

        var svg = d3.select("#vizDiv").append("svg")
            .attr("width", width)
            .attr("height", diameter)
            .append("g")
            .attr("transform", "translate(" + width/2 + "," + diameter/2 + ")");

        var link = svg.append("g").selectAll(".link"),
            node = svg.append("g").selectAll(".node");

        function load(classes) {
            var root = packageHierarchy(classes)
                .sum(function(d) { return d.size; });

            cluster(root);

            link = link
                .data(packageImports(root.leaves()))
                .enter().append("path")
                .each(function(d) {
                    d.source = d[0], d.target = d[d.length - 1];
                })
                .attr("class", "link")
                .each(function(d) {
                    d3.select(this).attr("d", getLine());
                });

            node = node
                .data(root.leaves())
                .enter().append("text")
                .attr("class", "node")
                .attr("dy", "0.31em")
                .attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + (getNewDY(d) + 8) + ",0)" + (d.x < 180 ? "" : "rotate(180)"); })
                .attr("text-anchor", function(d) { return d.x < 180 ? "start" : "end"; })
                .text(function(d) { return d.data.key; })
                .on("mouseover", mouseovered)
                .on("mouseout", mouseouted);
        };

        function mouseovered(d) {
            node
                .each(function(n) { n.target = n.source = false; });

            link
                .classed("link--target", l => {
                    if (l.target === d) return l.source.source = true;
                    return null;
                })
                .classed("link--source", l => {
                    if (l.source === d) return l.target.target = true;
                    return null;
                })
                .filter(l => l.target === d || l.source === d)
                .raise();

            node
                .classed("node--target", n => n.target)
                .classed("node--source", n => n.source);
        }

        function mouseouted(d) {
            link
                .classed("link--target", false)
                .classed("link--source", false);

            node
                .classed("node--target", false)
                .classed("node--source", false);
        }

        // Lazily construct the package hierarchy from class names.
        function packageHierarchy(classes) {
            var map = {};

            function find(name, data) {
                var node = map[name], i;
                if (!node) {
                    node = map[name] = data || {name: name, children: []};
                    if (name.length) {
                        node.parent = find(name.substring(0, i = name.lastIndexOf(".")));
                        node.parent.children.push(node);
                        node.key = name.substring(i + 1);
                    }
                }
                return node;
            }

            classes.forEach(function(d) {
                find(d.name, d);
            });

            return d3.hierarchy(map[""]);
        }

        // Return a list of imports for the given array of nodes.
        function packageImports(nodes) {
            var map = {},
                imports = [];

            // Compute a map from name to node.
            nodes.forEach(function(d) {
                map[d.data.name] = d;
            });

            // For each import, construct a link from the source to target node.
            nodes.forEach(function(d) {
                if (d.data.links) d.data.links.forEach(function(i) {
                    imports.push(map[d.data.name].path(map[i]));
                });
            });

            return imports;
        }

        const mapUsers = {};
        const freshData = getFreshDatabase();
        users.forEach(user => {
            mapUsers[user] = [];
        });
        for (let i = 0; i < freshData.length - 1; i++) {
            if (freshData[i].user == freshData[i + 1].user) continue;
            mapUsers[freshData[i].user].push(freshData[i + 1].user);
        }
        load(users.map(e => ({name: e, links: mapUsers[e]})));
    }

    $('#viz-tab').click(e => {
        $('#vizDiv').empty();
        d3eval();
    });

})();
