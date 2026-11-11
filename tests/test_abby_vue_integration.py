import json
import os


def test_abby_vue_package_structure_and_exports():
    base = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    pkg = json.load(open(os.path.join(base, "packages", "vue", "package.json"), encoding="utf-8"))
    assert pkg["name"] == "@tryabby/vue"
    assert "@tryabby/core" in pkg["dependencies"]
    assert "vue" in pkg["peerDependencies"]

    src = open(os.path.join(base, "packages", "vue", "src", "index.ts"), encoding="utf-8").read()
    for required_symbol in ("createAbby", "AbbyProvider", "useAbby", "useFeatureFlag", "useRemoteConfig", "onAct"):
        assert required_symbol in src


def test_abby_vue_unit_and_type_tests_present():
    base = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    t_code = open(os.path.join(base, "packages", "vue", "tests", "useAbby.test.ts"), encoding="utf-8").read()
    assert "useAbby" in t_code
    assert "useFeatureFlag" in t_code
    assert "useRemoteConfig" in t_code
