"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClassNameById = exports.CLASSES = exports.getSubjectNameById = exports.SUBJECTS = void 0;
exports.SUBJECTS = [
    { id: "maths", name: "Mathematics", classLevels: ["class_1", "class_2", "class_3", "class_4", "class_5", "class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
    { id: "reasoning", name: "Reasoning", classLevels: ["class_1", "class_2", "class_3", "class_4", "class_5", "class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
    { id: "science", name: "Science", classLevels: ["class_1", "class_2", "class_3", "class_4", "class_5", "class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
    { id: "gk", name: "General Knowledge", classLevels: ["jkg", "skg", "class_1", "class_2", "class_3", " class_4", " class_5", " class_6", " class_7", " class_8", " class_9", " class_10", " class_11", " class_12"] },
    { id: "english", name: "English", classLevels: ["jkg", "skg", "class_1", "class_2", "class_3", " class_4", " class_5", " class_6", " class_7", " class_8", " class_9", " class_10", " class_11", " class_12"] },
    { id: "history", name: "History", classLevels: ["class_1", "class_2", "class_3", "class_4", "class_5", "class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
    { id: "geography", name: "Geography", classLevels: ["class_1", "class_2", "class_3", "class_4", "class_5", "class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
    { id: "civics", name: "Civics", classLevels: ["jkg", "skg", " class_1", " class_2", " class_3", " class_4", " class_5", " class_6", " class_7", " class_8", " class_9", " class_10", " class_11", " class_12"] },
    { id: "physics", name: "Physics", classLevels: ["class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
    { id: "chemistry", name: "Chemistry", classLevels: ["class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
    { id: "biology", name: "Biology", classLevels: ["class_6", "class_7", "class_8", "class_9", "class_10", "class_11", "class_12"] },
];
var getSubjectNameById = function (id) {
    var subject = exports.SUBJECTS.find(function (subj) { return subj.id === id; });
    return subject ? subject.name : "Unknown Subject";
};
exports.getSubjectNameById = getSubjectNameById;
// class_6
// 2installHook.js:1 class_7
// installHook.js:1 class_5
// installHook.js:1 class_6
// 3installHook.js:1 class_8
// installHook.js:1 class_7
// 2installHook.js:1 class_6
exports.CLASSES = [
    { id: "jkg", name: "JKG" },
    { id: "skg", name: "SKG" },
    { id: "class_1", name: "Class 1" },
    { id: "class_2", name: "Class 2" },
    { id: "class_3", name: "Class 3" },
    { id: "class_4", name: "Class 4" },
    { id: "class_5", name: "Class 5" },
    { id: "class_6", name: "Class 6" },
    { id: "class_7", name: "Class 7" },
    { id: "class_8", name: "Class 8" },
    { id: "class_9", name: "Class 9" },
    { id: "class_10", name: "Class 10" },
    { id: "class_11", name: "Class 11" },
    { id: "class_12", name: "Class 12" },
];
var getClassNameById = function (id) {
    var classItem = exports.CLASSES.find(function (cls) { return cls.id === id; });
    return classItem ? classItem.name : "Unknown Class";
};
exports.getClassNameById = getClassNameById;
