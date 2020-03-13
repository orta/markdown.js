function markdown(src, img_cdn = '') {
    let _text = src.replace(/(\r\n|\r)/g, "\n");
    let _html = '';
    let tokens = [];
    let inline_parse = function (str) {
        return str
            .replace(/([^\\]|^)!\[(.*?)\]\((http.*?)\)/g, '$1<img alt="$2" src="$3" >')
            .replace(/([^\\]|^)!\[(.*?)\]\((.*?)\)/g, '$1<img alt="$2" src="' + img_cdn + '$3" >')
            .replace(/([^\\]|^)\[(.*?)\]\((#.*?)\)/g, '$1<a href="$3">$2</a>')
            .replace(/([^\\]|^)\[(.*?)\]\((.*?)\)/g, '$1<a target="_blank" href="$3">$2</a>')
            .replace(/([^\\]|^)\*\*(.+?)\*\*/g, '$1<b>$2</b>')
            .replace(/([^\\]|^)\*(.+?)\*/g, '$1<i>$2</i>')
            .replace(/([^\\]|^)~~(.+?)~~/g, '$1<s>$2</s>')
            .replace(/([^\\]|^)`(.+?)`/g, function (match, prefix, code) {
                return prefix + '<code>' + code_parse(code) + '</code>'
            })
            .replace(/\\([!\[\*\~`])/g, '$1')
    };
    let code_parse = function (str) {
        return str.replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }
    let h, br, li, code, blockquote, table, p, s, n;
    while (_text) {
        if (h = _text.match(/^(#{1,6})\s+(.*?)(?:\s*|{#(\S*)})(?:\n+|$)/)) {
            // heading
            tokens.push({
                type: 'h',
                level: h[1].length,
                attributes: h[3] === undefined ? '' : ' id="' + h[3] + '"',
                text: h[2]
            });
            _text = _text.substring(h[0].length)
        } else if (br = _text.match(/^([*-]){3}(?:\n+|$)/)) {
            // break
            tokens.push({
                type: 'br',
                tag: br[1] === '*' ? 'br' : 'hr',
            });
            _text = _text.substring(br[0].length);
        } else if (li = _text.match(/^(\*|(\d)\.)\s([\s\S]*?)(?:\n{2,}|$)/)) {
            // list
            tokens.push({
                type: 'li',
                tag: li[1] === '*' ? 'ul' : 'ol',
                text: li[0],
            });
            _text = _text.substring(li[0].length);
        } else if (code = _text.match(/^```(\S*)\n([\s\S]+?)\n```(?:\n|$)/)) {
            // code
            tokens.push({
                type: 'code',
                lang: code[1],
                text: code[2],
                attributes: code[1] === '' ? '' : ' class="language-' + code[1] + '"'
            });
            _text = _text.substring(code[0].length);
        } else if (blockquote = _text.match(/^>(?:\s|\[(\S+?)\]\s)([\s\S]*?)(?:\n{2,}|$)/)) {
            // blockquote
            tokens.push({
                type: 'blockquote',
                attributes: blockquote[1] === undefined ? '' : ' class="' + blockquote[1] + '"',
                text: blockquote[2]
            })
            _text = _text.substring(blockquote[0].length);
        } else if (table = _text.match(/^\|(.+?)\|\n/)) {
            // table
            let align = _text.substring(table[0].length).match(/^\|([-:\|\s]+?)\|\n/);
            _text = _text.substring(table[0].length);
            if (align === null) {
                tokens.push({
                    type: 'p',
                    text: table[0],
                });
                continue;
            } else {
                let node = {
                    type: "table",
                    header: table[1].split('|').map(function(item){return item.trim()}),
                    align: [],
                    cells: [],
                }
                let table_align = align[1].split('|');
                for (let tai = 0; tai < table_align.length; tai++) {
                    let ta_text = table_align[tai].replace(/^\s+|\s+$/g, "");
                    if (ta_text.substring(0, 1) == ':' && ta_text.substring(ta_text.length - 1) == ':') {
                        node.align.push('center');
                    } else if (ta_text.substring(0, 1) == ':') {
                        node.align.push('left');
                    } else if (ta_text.substring(ta_text.length - 1) == ':') {
                        node.align.push('right');
                    } else {
                        node.align.push('');
                    }
                }
                _text = _text.substring(align[0].length);
                let table_cell;
                while (table_cell = _text.match(/^\|(.+?)\|(?:\n|$)/)) {
                    node.cells.push(table_cell[1].split('|').map(function(item){return item.trim()}));
                    _text = _text.substring(table_cell[0].length);
                }
                tokens.push(node);
            }
        } else if (p = _text.match(/^.+/)) {
            // paragraph
            let token = {
                type: 'p',
                text: p[0]
            }
            let last_token = tokens.pop();
            if (last_token) {
                if (last_token.type === 'p') {
                    last_token.text += ('\n' + token.text);
                    tokens.push(last_token)
                } else {
                    tokens.push(last_token, token)
                }
            } else {
                tokens.push(token)
            }
            _text = _text.substring(p[0].length)
        } else if (s = _text.match(/^\n{2,}/)) {
            // space
            tokens.push({
                type: 's',
            })
            _text = _text.substring(s[0].length)
        } else if (n = _text.match(/^\s+/)){
            // none
            _text = _text.substring(n[0].length)
        } else {
            // error
            _text = '';
            console.error('parse error: ', tokens.pop())
        }
        continue;
    }
    let token;
    while (token = tokens.shift()) {
        switch(token.type) {
            case 'h':
                _html += '<h' + token.level + token.attributes + '>' + inline_parse(token.text) + '</h' + token.level + '>';
                break;
            case 'br':
                _html += '<' + token.tag + '>';
                break;
            case 'p':
                _html += '<p>' + inline_parse(token.text) + '</p>';
                break;
            case 'li':
                _html += '<' + token.tag + '>';
                token.text.split('\n').forEach(function (item) {
                    if (item !== '') {
                        _html += '<li>' + inline_parse(item.replace(/^\s*(\*|(\d)\.)\s/, '')) + '</li>'
                    }
                })
                _html += '</' + token.tag + '>';
                break;
            case 'code':
                _html += '<pre><code' + token.attributes + '>' + code_parse(token.text) + '</code></pre>';
                break;
            case 'blockquote':
                _html += '<blockquote' + token.attributes + '>' + inline_parse(token.text.replace(/\n/g, '<br>')) + '</blockquote>';
                break;
            case 'table':
                let thead = '<thead><tr>';
                for (let i=0; i<token.header.length; i++) {
                    thead += '<th' + (token.align[i] ? ' align="' + token.align[i] + '"' : '') + '>' + inline_parse(token.header[i]) + '</th>';
                }
                thead += '</tr></thead>';
                let tbody = '<tbody>';
                for (let i=0; i<token.cells.length; i++) {
                    tbody += "<tr>";
                    for (let j=0; j < token.cells[i].length; j++) {
                        tbody += '<td' + (token.align[j] ? ' align="' + token.align[j] + '"' : '') + '>' + inline_parse(token.cells[i][j]) + '</td>';
                    }
                    tbody += "</tr>";
                }
                tbody += '</tbody>';
                _html += '<table>' + thead + tbody + '</table>';
                break;
        }
    }
    return _html;
}
module.exports = markdown;