import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  SafeAreaView,
  TextInput,
  Platform,
  AppState,
  Keyboard,
  Dimensions,
  BackHandler,
} from 'react-native';
import {GlobalStyles} from '../src/GlobalStyles';
import Layout from '../src/Layout';
import NoteHeader from '../src/NoteHeader';
import {LEFTPADDING, RIGHTPADDING} from '../src/constants';
import {useNavigation} from '@react-navigation/native';
import {isEmpty} from 'lodash';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {v4 as uuidv4} from 'uuid';
import {useSelector, useDispatch} from 'react-redux';
import {fetchNotes} from '../src/redux/actions';
import TagList from '../src/TagList';

function Note({route}) {
  const {noteToEdit} = route.params;

  const dispatch = useDispatch();
  const notes = useSelector(state => state.noteR.notes);

  const [title, setTitle] = useState(noteToEdit?.title ? noteToEdit.title : '');
  const [note, setNote] = useState(
    isEmpty(noteToEdit) ? '' : noteToEdit.content,
  );
  const [NoteId, setNoteId] = useState(
    isEmpty(noteToEdit) ? uuidv4() : noteToEdit.id,
  );

  const navigation = useNavigation();

  // array of selected tags

  const [selectedTags, setSelectedTags] = useState(
    noteToEdit?.tags ? noteToEdit.tags : [],
  );

  useEffect(() => {
    navigation.addListener('beforeRemove', saveData);
    AppState.addEventListener('change', handleAppStateChange);

    return () => {
      navigation.removeListener('beforeRemove', saveData);
      AppState.removeEventListener('change', handleAppStateChange);
    };
  }, [note, title, selectedTags]);

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    console.warn(notes);
    console.warn('edit', noteToEdit);

    Keyboard.addListener('keyboardWillShow', e => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    Keyboard.addListener('keyboardWillHide', e => {
      setKeyboardHeight(0);
    });

    return () => {
      Keyboard.addListener('keyboardWillShow', e => {
        setKeyboardHeight(e.endCoordinates.height);
      });
      Keyboard.addListener('keyboardWillHide', e => {
        setKeyboardHeight(0);
      });
    };
  }, []);

  const saveData = async () => {
    if (!isEmpty(title) && !isEmpty(note)) {
      const allnotesdata = await AsyncStorage.getItem('papr_notes');
      const allnotes = JSON.parse(allnotesdata);

      const currentNote = {
        id: NoteId,
        title,
        content: note,
        tags: [...selectedTags],
      };

      console.log('selected', currentNote);
      let newallnotes = [];
      if (isEmpty(allnotes)) {
        // if no notes are there then save the first note
        newallnotes.push(currentNote);
        const notes = JSON.stringify(newallnotes);
        await AsyncStorage.setItem('papr_notes', notes);
      } else {
        // check if the note is already saved, if it is then don't
        // save again just update the exisiting note
        let isNoteSaved = allnotes?.filter(note => note.id === NoteId);
        if (isEmpty(isNoteSaved)) {
          newallnotes = [...allnotes];
          newallnotes.push(currentNote);
          const notes = JSON.stringify(newallnotes);
          await AsyncStorage.setItem('papr_notes', notes);
        } else {
          // in case of localstorage - remove the note and add a new one with same id
          let updatednotes = allnotes?.map(item => {
            if (item.id !== NoteId) {
              return item;
            } else {
              return {
                ...item,
                title: title,
                content: note,
                tags: [...selectedTags],
              };
            }
          });
          const newnotes = JSON.stringify(updatednotes);
          await AsyncStorage.setItem('papr_notes', newnotes);
        }
      }

      dispatch(fetchNotes());
    }
  };

  const handleAppStateChange = nextAppState => {
    if (nextAppState === 'background' || nextAppState === 'inactive') {
      saveData();
    }
  };

  // states for tag list drawer
  const [isTagListOpen, setTagListOpen] = useState(false);

  return (
    <View>
      <Layout>
        <SafeAreaView>
          <NoteHeader
            setTagListOpen={setTagListOpen}
            noteid={NoteId}
            noteToEdit={noteToEdit}
            saveData={saveData}
          />
        </SafeAreaView>
        <ScrollView
          bounces={false}
          style={styles.container}
          showsVerticalScrollIndicator={false}>
          <Title title={title} setTitle={setTitle} />
          <NoteInput note={note} setNote={setNote} />
          <View style={{height: 80}} />
        </ScrollView>
      </Layout>
      <TagList
        keyboardHeight={keyboardHeight}
        isTagListOpen={isTagListOpen}
        setTagListOpen={setTagListOpen}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 20 : 5,
    paddingLeft: LEFTPADDING,
    paddingRight: RIGHTPADDING,
  },
});

/* Title Input Component */

function Title({title, setTitle}) {
  return (
    <View>
      <TextInput
        value={title}
        style={titlestyles.titleInput}
        onChangeText={value => setTitle(value)}
        placeholder="Title"
      />
    </View>
  );
}

const titlestyles = StyleSheet.create({
  titleInput: {
    width: '100%',
    fontFamily: 'Inter-Black',
    fontSize: 25,
    paddingVertical: 0,
    marginBottom: 15,
  },
});

/* Note Input Component */

function NoteInput({note, setNote}) {
  return (
    <View>
      <TextInput
        value={note}
        scrollEnabled={false}
        style={noteinputstyles.input}
        onChangeText={value => setNote(value)}
        placeholder="Start writing your amazing idea"
        multiline={true}
      />
    </View>
  );
}

const noteinputstyles = StyleSheet.create({
  input: {
    width: '100%',
    fontFamily: 'Inter-Regular',
    paddingVertical: 0,
    fontSize: 18,
    marginBottom: 15,
  },
});

export default Note;
