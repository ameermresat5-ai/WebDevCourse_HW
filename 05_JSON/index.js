let userObj = {
  username: "shadi",
  grade: 85,
  password: "pass123",
  IsConnected: true,
  address: {
    counrty: "Israel",
    city: "Tel-Hai",
    street: "Main St",
  },
  allGrades: [{ csahrp: 90 }, { cpp: 80 }, 85, 90, 78, 92],
};

let bewGrade = userObj.grade + 10;
userObj.grade += 10;
userObj.id = 1000;

let userObj2 = userObj;
userObj.grade += 10;
userObj2.grade = 0;
let grade1 = userObj.grade;

userObj.address.street = "";
userObj["address"].city = "New City";

let arr = [
  userObj,
  {
    username: "shadi",
    grade: 85,
    password: "pass123",
    IsConnected: true,
    address: {
      counrty: "Israel",
      city: "Tel-Hai",
      street: "Main St",
    },
    allGrades: [{ csahrp: 90 }, { cpp: 80 }, 85, 90, 78, 92],
  },
];

arr[0].allGrades[1] = { cpp: 100 };
arr[1].avg = 95;

let user2 = arr[1];
user2.password = "12345";
