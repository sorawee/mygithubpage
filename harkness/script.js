$(function () {
    /**
     * @typedef Row
     * @type {Object}
     * @property {number} id
     * @property {string} user
     * @property {number} duration
     * @property {string} note
     */

    let users = [];
    let current = null;
    let database = [];
    let currentId = 1;

    /**
     * @param {number} id
     * @param {string} user
     * @param {number} duration
     * @param {string} note
     * @returns {Row}
     */
    function makeRow(id, user, duration, note) {
        return {
            id: id,
            user: user,
            duration: duration,
            note: note
        };
    }

    function refreshUsers() {
        const ul = $('#userList');
        ul.empty();
        users.forEach(user => {
            const td = $('<td/>')
                  .text(user)
                  .click(e => {
                      update(`:start-log ${user}`);
                  });
            ul.append($(`<tr/>`).append(td));
        });
    }

    function refreshLogs() {
        clearTr();
        database.forEach(row => {
            appendTr(rowToTr(row, false));
        });
        if (current != null) {
            appendTr(rowToTr(currentRow(), true));
        }
    }


    /**
     * @param {Row} row
     * @returns {JQuery}
     */
    function rowToTr(row, lastRow) {
        const rowLabel = lastRow ? '*' : row.id;
        function clickEventTd(field, val) {
            return e => {
                $('#command').typeahead('val', `:edit-log ${rowLabel} ${field} "${val}"`);
                $('#command').focus();
            };
        }
        return $('<tr/>')
            .append($('<td/>').text(rowLabel))
            .append($('<td/>').text(row.user).click(clickEventTd('user', row.user)))
            .append($('<td/>').text(durationToString(row.duration)).click(clickEventTd('duration', row.duration)))
            .append($('<td/>').text(row.note).click(clickEventTd('note', row.note)));
    }

    function scrollLog() {
        const elem = document.getElementById('app-container');
        elem.scrollTop = elem.scrollHeight;
    }

    const commands = [
        "pause-time",
        "resume-time",
        "add-user",
        "remove-user",
        "stop-log",
        "edit-log",
        "remove-log",
        "start-log",
        "note"
    ];

    function getRowLabels() {
        return database.map(row => row.id).concat(current == null ? [] : ['*']);
    }

    function substringMatcher(q, cb) {
        const autocomplete = [
            {
                pattern: ':remove-user ',
                target: () => users
            },
            {
                pattern: ':start-log ',
                target: () => users
            },
            {
                pattern: ':remove-log ',
                target: getRowLabels
            },
            {
                pattern: ':edit-log (\\d+|\\*) user ',
                target: () => users
            },
            {
                pattern: ':edit-log (\\d+|\\*) ',
                target: () => ['user', 'duration', 'note']
            },
            {
                pattern: ':edit-log ',
                target: getRowLabels
            },
            {
                pattern: ':',
                target: () => commands
            },
            {
                pattern: '\\+',
                target: () => users
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

    /* Precondition: current != null */
    function getCurrentDuration() {
        return current.duration +
            ((current.latestStartTime == null) ?
             0 : getCurrentSec() - current.latestStartTime);
    }

    function durationToString(n) {
        const seconds = n % 60;
        const mins = Math.floor(n / 60);
        return `${mins} m ${seconds} s`;
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
        $('#message').val($('#message').val() + "\r\n" + msg);

        const textarea = document.getElementById('message');
        textarea.scrollTop = textarea.scrollHeight;
    }

    /* Precondition: current != null */
    function flushCurrent() {
        const duration = getCurrentDuration();
        const row = currentRow();
        database.push(row);
        currentId++;
        removeLastTr();
        appendTr(rowToTr(row, false));
        log(`User ${current.user} finishes with duration = ${duration}`);
        current = null;
    }

    function getFreshDatabase() {
        return database.concat((current != null) ? [currentRow()] : []);
    }

    /* Precondition: current != null */
    function currentRow() {
        return makeRow(current.id, current.user, getCurrentDuration(), current.note);
    }

    function appendTr(tr) {
        $('#app-table-body').append(tr);
    }

    function removeLastTr() {
        $('#app-table-body tr:last').remove();
    }

    function clearTr() {
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

    function getRowIndex(target) {
        const id = Number(target);
        if (Number.isNaN(id)) {
            log(`${target} is not a log id. Aborted.`);
            return null;
        }
        const index = database.findIndex(row => row.id == id);
        if (index == -1) {
            log(`Log id ${id} is not found. Aborted.`);
        }
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

        function badArity(expectedLength) {
            if (args.length != expectedLength) {
                log(`Wrong number of arguments: expect ${expectedLength}, got ${args.length}`);
                return true;
            }
            return false;
        }

        switch (mode) {
        case 'start-log': {
            if (badArity(1)) return;
            const user = args[0];

            if (! users.includes(user)) {
                log(`User ${user} is not in the user list. Aborted.`);
                return;
            }

            if (current != null && user == current.user) {
                log(`User ${current.user} has already started. Aborted.`);
                return;
            }
            if (current != null) flushCurrent();
            current = {
                user: user,
                latestStartTime: getCurrentSec(),
                duration: 0,
                id: currentId,
                note: '',
            };
            appendTr(rowToTr(currentRow(), true));
            scrollLog();

            log(`User ${user} starts`);

        } break;

        case 'pause-time': {
            if (badArity(0)) return;
            if (current == null) {
                log("Can't pause. Aborted");
                return;
            }
            current.duration = getCurrentDuration();
            current.latestStartTime = null;
            scrollLog();

            log('Paused.');

        } break;

        case 'resume-time': {
            if (badArity(0)) return;
            if (current == null || current.latestStartTime != null) {
                log("Can't continue. Aborted");
                return;
            }
            current.latestStartTime = getCurrentSec();
            scrollLog();

            log('Continued.');

        } break;

        case 'stop-log': {
            if (badArity(0)) return;
            if (current == null) {
                log("Can't stop. Aborted.");
                return;
            }
            flushCurrent();
            current = null;
            scrollLog();

            log('Stopped.');
        } break;

        case 'note': {
            if (current == null) {
                log(`Can't note. Aborted.`);
                return;
            }
            current.note += args[0] + '\n';
            scrollLog();

            log("Note added.");
        } break;

        case 'add-user': {
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

        case 'remove-user': {
            if (badArity(1)) return;
            const user = args[0];
            const idx = users.indexOf(user);
            if (idx == -1) {
                log(`${user} is not a user. Aborted.`);
                return;
            }
            users.splice(idx, 1);
            refreshUsers(); // could be more efficient, but we don't care here

            log(`User ${user} is removed.`);

        } break;

        case 'edit-log': {
            if (badArity(3)) return;

            const target = args[0];
            const field = args[1];
            const val = args[2];

            let rowObj;

            if (target == '*') {
                rowObj = currentRow();
            } else {
                const rowIndex = getRowIndex(target);
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

            if (target == '*') {
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

        case 'remove-log': {
            if (badArity(2)) return;
            const target = args[0];
            const confirmation = args[1];
            let rowIndex;
            if (target == '*') {
                rowIndex = -1;
            } else {
                rowIndex = getRowIndex(target);
                if (rowIndex == -1) return;
            }
            if (confirmation == 'confirm') {
                if (target == '*') {
                    current = null;
                    removeLastTr();
                } else {
                    database.splice(rowIndex, 1);
                    refreshLogs();
                }
                log(`Remove log ${target}`);
            } else {
                log(`Need "confirm" as an argument. Got ${confirmation}.`);
                return;
            }
        } break;

        default:
            log(`Unknown command: ${mode}`);
            return;
        }
    }

    setInterval(() => {
        if (current != null) {
            removeLastTr();
            appendTr(rowToTr(currentRow(), true));
        }
    }, 500);


    $('#command').typeahead({
        highlight: true,
    }, {
        source: substringMatcher
    });

    $('#command').keyup(e => {
        if (e.keyCode == 13) {
            update($('#command').val());
            $('#command').typeahead('close');
            $('#command').typeahead('val', '');
        } else if (e.keyCode == 9) {
            const val = $('#command').typeahead('val');
            $('#command').typeahead('close');
            $('#command').typeahead('val', '');
            $('#command').typeahead('val', val);
            $('#command').typeahead('open');
        }
    });

    $('body').keyup(e => {
        $('#command').focus();
    });

    refreshUsers();

    $('#command').focus();

    $('#file-save').click(e => {
        log("Save requested");
        const saver = $('#file-save');
        saver.attr('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(
            Papa.unparse(users.map(user => makeRow(-1, user, 0, "")).concat(getFreshDatabase()))
        ));
        saver.attr('download', 'haskness-log.csv');
    });

    $('#file-load').change(e => {
        const f = e.target.files[0];
        if (f) {
            const reader = new FileReader();
            reader.readAsText(f);
            reader.onload = (e) => {
                const data = Papa.parse(reader.result, {header: true});
                if (data.errors.length > 0) {
                    log(`Can't load ${f.name}. Aborted.`);
                    return;
                }
                // TODO: need to handle malformed csv
                users = [];
                database = [];
                current = null;
                currentId = 0; // set to 0 so that if currentId is not set below at all, currentId + 1 = 1
                data.data.forEach(row => {
                    if (row.id == -1) {
                        users.push(row.user);
                    } else {
                        database.push(row);
                        appendTr(rowToTr(row, false));
                        currentId = row.id;
                    }
                });
                currentId++;
                refreshUsers();
                log("Load successfully");
            };
        }
    });
});
