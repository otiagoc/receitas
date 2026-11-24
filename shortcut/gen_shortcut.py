#!/usr/bin/env python3
"""Generate the unsigned "Guardar Receita" iOS Shortcut (WFWorkflow plist).

Usage: gen_shortcut.py <credentials_file> <output_unsigned.shortcut>
The SHARE_TOKEN is read from the credentials file and embedded in the output,
so the output must never be committed.
"""
import plistlib
import sys
import uuid

ENDPOINT = "https://vhvhwfwkfdfzjoiqqqok.supabase.co/rest/v1/rpc/enqueue_recipe"
APIKEY = "sb_publishable_x-_kXcu3XoDtwA6p04UFyQ_hB10FJIP"
APP_URL = "https://otiagoc.github.io/receitas/"
OBJ = "￼"  # object replacement char marks a variable position


def read_token(path):
    with open(path, encoding="utf-8") as f:
        for line in f:
            if line.startswith("SHARE_TOKEN="):
                tok = line.split("=", 1)[1].strip().strip('"').strip("'")
                if tok:
                    return tok
    sys.exit("SHARE_TOKEN not found in credentials file")


def uid():
    return str(uuid.uuid4()).upper()


def out_ref(out_uuid, name):
    return {"Type": "ActionOutput", "OutputUUID": out_uuid, "OutputName": name}


def text(*parts):
    """WFTextTokenString from plain strings and variable refs (dicts)."""
    s, atts = "", {}
    for p in parts:
        if isinstance(p, dict):
            atts["{%d, 1}" % len(s)] = p
            s += OBJ
        else:
            s += p
    v = {"string": s}
    if atts:
        v["attachmentsByRange"] = atts
    return {"Value": v, "WFSerializationType": "WFTextTokenString"}


def attach(ref):
    return {"Value": ref, "WFSerializationType": "WFTextTokenAttachment"}


def dict_field(pairs):
    return {
        "Value": {
            "WFDictionaryFieldValueItems": [
                {"WFItemType": 0, "WFKey": text(k), "WFValue": v if isinstance(v, dict) else text(v)}
                for k, v in pairs
            ]
        },
        "WFSerializationType": "WFDictionaryFieldValue",
    }


def action(ident, params):
    return {"WFWorkflowActionIdentifier": ident, "WFWorkflowActionParameters": params}


def build(token):
    u_text, u_urls, u_first, u_resp, u_resptxt, u_dict, u_msg = (uid() for _ in range(7))
    grp = uid()
    ext_input = {"Type": "ExtensionInput"}

    actions = [
        # 1. Shortcut Input -> Text
        action("is.workflow.actions.gettext", {"UUID": u_text, "WFTextActionText": text(ext_input)}),
        # 2. Get URLs from the text (Instagram may share text containing the link)
        action("is.workflow.actions.detect.link", {"UUID": u_urls, "WFInput": attach(out_ref(u_text, "Text"))}),
        # 3. First URL
        action("is.workflow.actions.getitemfromlist", {
            "UUID": u_first, "WFItemSpecifier": "First Item",
            "WFInput": attach(out_ref(u_urls, "URLs")),
        }),
        # 4. POST to the RPC
        action("is.workflow.actions.downloadurl", {
            "UUID": u_resp,
            "WFURL": ENDPOINT,
            "WFHTTPMethod": "POST",
            "ShowHeaders": True,
            "WFHTTPHeaders": dict_field([("apikey", APIKEY), ("Content-Type", "application/json")]),
            "WFHTTPBodyType": "JSON",
            "WFJSONValues": dict_field([
                ("p_token", token),
                ("p_url", text(out_ref(u_first, "Item from List"))),
            ]),
        }),
        # 5. Response as text (success = "uuid", error = {"message": ...})
        action("is.workflow.actions.gettext", {
            "UUID": u_resptxt, "WFTextActionText": text(out_ref(u_resp, "Contents of URL")),
        }),
        # 6. If response contains "message" -> error
        action("is.workflow.actions.conditional", {
            "GroupingIdentifier": grp, "WFControlFlowMode": 0,
            "WFCondition": 99, "WFConditionalActionString": "\"message\"",
            "WFInput": {"Type": "Variable", "Variable": attach(out_ref(u_resptxt, "Text"))},
        }),
        action("is.workflow.actions.detect.dictionary", {
            "UUID": u_dict, "WFInput": attach(out_ref(u_resptxt, "Text")),
        }),
        action("is.workflow.actions.getvalueforkey", {
            "UUID": u_msg, "WFGetDictionaryValueType": "Value", "WFDictionaryKey": "message",
            "WFInput": attach(out_ref(u_dict, "Dictionary")),
        }),
        action("is.workflow.actions.notification", {
            "WFNotificationActionTitle": "Guardar Receita",
            "WFNotificationActionBody": text("Não consegui adicionar: ", out_ref(u_msg, "Dictionary Value")),
            "WFNotificationActionSound": True,
        }),
        action("is.workflow.actions.conditional", {"GroupingIdentifier": grp, "WFControlFlowMode": 1}),
        action("is.workflow.actions.notification", {
            "WFNotificationActionTitle": "Guardar Receita",
            "WFNotificationActionBody": text("Receita adicionada 🍳 — vai aparecer na app daqui a uns minutos"),
            "WFNotificationActionSound": True,
        }),
        action("is.workflow.actions.conditional", {"GroupingIdentifier": grp, "WFControlFlowMode": 2}),
    ]

    return {
        "WFWorkflowName": "Guardar Receita",
        "WFWorkflowClientVersion": "2607.0.2",
        "WFWorkflowMinimumClientVersion": 900,
        "WFWorkflowMinimumClientVersionString": "900",
        "WFWorkflowIcon": {"WFWorkflowIconStartColor": 4271458815, "WFWorkflowIconGlyphNumber": 59511},
        "WFWorkflowImportQuestions": [],
        "WFWorkflowTypes": ["ActionExtension"],
        "WFWorkflowInputContentItemClasses": ["WFURLContentItem", "WFStringContentItem"],
        "WFWorkflowHasShortcutInputVariables": True,
        "WFWorkflowNoInputBehavior": {"Name": "WFWorkflowNoInputBehaviorGetClipboard", "Parameters": {}},
        "WFWorkflowOutputContentItemClasses": [],
        "WFWorkflowHasOutputFallback": False,
        "WFQuickActionSurfaces": [],
        "WFWorkflowActions": actions,
    }


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    wf = build(read_token(sys.argv[1]))
    with open(sys.argv[2], "wb") as f:
        plistlib.dump(wf, f, fmt=plistlib.FMT_BINARY)
