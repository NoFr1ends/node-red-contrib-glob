const Glob = require("glob").Glob;
const path = require("path");

module.exports = function(RED) {
    function GlobNode(config) {
        RED.nodes.createNode(this, config);

        this.name = config.name || "Glob";
        this.pattern = config.pattern || "";
        this.patternType = config.patternType || "str";
        this.path = config.path || "";
        this.pathType = config.pathType || "str";
        this.property = config.property || "payload";
        this.output = config.output || "messages";

        const node = this;
        node.on("input", (msg, send, done) => {
            const pattern = RED.util.evaluateNodeProperty(node.pattern, node.patternType, node, msg);
            let path = RED.util.evaluateNodeProperty(node.path, node.pathType, node, msg);
            if(!path) {
                path = process.cwd();
            }
            if(!pattern) {
                node.error({message: "No pattern specified"}, msg);
            }

            Glob(pattern, {
                cwd: path,
                nodir: true
            }, (err, matches) => {
                if(err) {
                    node.error(err, msg);
                    return;
                }

                if(this.output === 'messages') {
                    const len = matches.length;
                    matches.forEach((match, i) => {
                        const newMessage = RED.util.cloneMessage(msg);
                        newMessage[node.property] = node.createObject(path, match);
                        newMessage.parts = {
                            id: msg._msgid,
                            index: i,
                            count: len
                        };
                        send(newMessage);
                    });
                    done();
                } else {
                    msg[node.property] = matches.map(match => node.createObject(path, match));
                    send(msg);
                    done();
                }
            });
        });
    }

    GlobNode.prototype.createObject = function(p, filename) {
        p = path.normalize(path.join(p, filename));
        const file = path.basename(p);
        const filedir = path.dirname(p);
        return {filename: p, file, filedir};
    }

    RED.nodes.registerType("glob", GlobNode);
}